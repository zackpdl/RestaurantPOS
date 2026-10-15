import * as Print from 'expo-print';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform, DeviceEventEmitter } from 'react-native';

export type ReceiptItem = {
  name: string;
  quantity: number;
  price: number;
};

export type ReceiptData = {
  restaurant: string;
  headerLine?: string;
  tableLabel: string;
  dateLabel?: string;
  paymentLabel?: string;
  items: ReceiptItem[];
  subtotal: number;
  taxEnabled: boolean;
  tax: number;
  total: number;
};

/* ------------------------------------------------------------------ *
 * Storage keys
 * ------------------------------------------------------------------ */

const KEY_ADDRESS = 'printerAddress';
const KEY_NAME = 'printerName';
const KEY_WIDTH = 'printerWidth'; // '58' | '80'

export const PRINTER_CHANGED_EVENT = 'pos:printer-changed';

/* ------------------------------------------------------------------ *
 * Lazy-load the native ESC/POS module.
 * It only exists in a dev client / standalone APK — never in Expo Go.
 * ------------------------------------------------------------------ */

type EscposModule = {
  BluetoothManager: any;
  BluetoothEscposPrinter: any;
};

let cachedModule: EscposModule | null = null;
let moduleLoadFailed = false;

export const loadEscpos = (): EscposModule | null => {
  if (cachedModule) return cachedModule;
  if (moduleLoadFailed) return null;

  try {
    const mod = require('react-native-bluetooth-escpos-printer');
    if (!mod?.BluetoothManager || !mod?.BluetoothEscposPrinter) {
      console.warn('[printer] module loaded but native bindings are missing');
      moduleLoadFailed = true;
      return null;
    }
    cachedModule = {
      BluetoothManager: mod.BluetoothManager,
      BluetoothEscposPrinter: mod.BluetoothEscposPrinter,
    };
    return cachedModule;
  } catch (err) {
    console.warn(
      '[printer] react-native-bluetooth-escpos-printer unavailable — Bluetooth printing disabled.',
      err
    );
    moduleLoadFailed = true;
    return null;
  }
};

export const isBluetoothPrintingAvailable = () => loadEscpos() !== null;

/* ------------------------------------------------------------------ *
 * Saved printer (persisted, survives app restarts)
 * ------------------------------------------------------------------ */

export type SavedPrinter = {
  address: string;
  name: string;
  width: '58' | '80';
};

export const getSavedPrinter = async (): Promise<SavedPrinter | null> => {
  try {
    const [address, name, width] = await Promise.all([
      AsyncStorage.getItem(KEY_ADDRESS),
      AsyncStorage.getItem(KEY_NAME),
      AsyncStorage.getItem(KEY_WIDTH),
    ]);

    // Fall back to the build-time env var so an existing .env keeps working.
    const envAddress = process.env.EXPO_PUBLIC_BLUETOOTH_PRINTER_ADDRESS?.trim();
    const finalAddress = address?.trim() || envAddress || '';

    if (!finalAddress) return null;

    return {
      address: finalAddress,
      name: name || 'Saved printer',
      width: width === '80' ? '80' : '58',
    };
  } catch (err) {
    console.warn('[printer] failed to read saved printer', err);
    return null;
  }
};

export const savePrinter = async (printer: SavedPrinter) => {
  await AsyncStorage.multiSet([
    [KEY_ADDRESS, printer.address],
    [KEY_NAME, printer.name],
    [KEY_WIDTH, printer.width],
  ]);
  DeviceEventEmitter.emit(PRINTER_CHANGED_EVENT);
};

export const clearPrinter = async () => {
  await AsyncStorage.multiRemove([KEY_ADDRESS, KEY_NAME, KEY_WIDTH]);
  DeviceEventEmitter.emit(PRINTER_CHANGED_EVENT);
};

/* ------------------------------------------------------------------ *
 * Runtime permissions
 *
 * Android 12+ (API 31+) needs BLUETOOTH_CONNECT / BLUETOOTH_SCAN at
 * runtime. Without BLUETOOTH_CONNECT, getBondedDevices() returns an
 * empty list — which is exactly why printers never showed up.
 * ------------------------------------------------------------------ */

export const requestBluetoothPermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;

  const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);

  try {
    if (apiLevel >= 31) {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      ]);

      const connectOk = result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
      const scanOk = result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED;

      if (!connectOk || !scanOk) {
        console.warn('[printer] Bluetooth permissions denied', result);
        return false;
      }
      return true;
    }

    // Android 11 and below use location permission for Bluetooth discovery.
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn('[printer] permission request failed', err);
    return false;
  }
};

/* ------------------------------------------------------------------ *
 * Device discovery / connection
 * ------------------------------------------------------------------ */

export type DiscoveredPrinter = {
  name: string;
  address: string;
  paired: boolean;
};

const parseDeviceArray = (raw: unknown, paired: boolean): DiscoveredPrinter[] => {
  try {
    const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(list)) return [];
    return list
      .filter((d: any) => d && d.address)
      .map((d: any) => ({
        name: d.name || d.address,
        address: d.address,
        paired,
      }));
  } catch {
    return [];
  }
};

/**
 * Returns paired printers plus any discovered during a scan.
 * Requires BLUETOOTH_CONNECT (Android 12+) — call
 * requestBluetoothPermissions() first.
 */
export const discoverPrinters = async (): Promise<DiscoveredPrinter[]> => {
  const mod = loadEscpos();
  if (!mod) throw new Error('Bluetooth printing is not available in this build.');

  const { BluetoothManager } = mod;

  try {
    await BluetoothManager.enableBluetooth();
  } catch (err) {
    console.warn('[printer] enableBluetooth failed (continuing)', err);
  }

  let paired: DiscoveredPrinter[] = [];

  try {
    const scanResult = await BluetoothManager.scanDevices();
    const parsed = typeof scanResult === 'string' ? JSON.parse(scanResult) : scanResult;
    paired = parseDeviceArray(parsed?.paired, true);
    const found = parseDeviceArray(parsed?.found, false);

    const seen = new Set(paired.map((p) => p.address));
    const merged = [...paired, ...found.filter((f) => !seen.has(f.address))];
    return merged;
  } catch (err) {
    console.warn('[printer] scanDevices failed', err);
    // Fall back to the already-paired list emitted by the native side.
    return await new Promise<DiscoveredPrinter[]>((resolve) => {
      let settled = false;
      const finish = (devices: DiscoveredPrinter[]) => {
        if (settled) return;
        settled = true;
        sub.remove();
        resolve(devices);
      };

      const sub = DeviceEventEmitter.addListener(
        BluetoothManager.EVENT_DEVICE_ALREADY_PAIRED,
        (rsp: any) => finish(parseDeviceArray(rsp?.devices, true))
      );

      setTimeout(() => finish(paired), 6000);
    });
  }
};

export const connectPrinter = async (address: string): Promise<boolean> => {
  const mod = loadEscpos();
  if (!mod) throw new Error('Bluetooth printing is not available in this build.');

  try {
    await mod.BluetoothManager.connect(address);
    return true;
  } catch (err) {
    console.warn('[printer] connect failed', err);
    return false;
  }
};

/* ------------------------------------------------------------------ *
 * ESC/POS receipt rendering
 * ------------------------------------------------------------------ */

const formatMoney = (value: number) => value.toFixed(2);

const charsForWidth = (width: '58' | '80') => (width === '80' ? 42 : 32);

const dotsForWidth = (width: '58' | '80') => (width === '80' ? 576 : 384);

const centerText = (text: string, width: number) => {
  if (text.length >= width) return text;
  const pad = Math.floor((width - text.length) / 2);
  return ' '.repeat(pad) + text;
};

const padRight = (text: string, width: number) => {
  if (text.length >= width) return text.slice(0, width);
  return text + ' '.repeat(width - text.length);
};

const padLeft = (text: string, width: number) => {
  if (text.length >= width) return text.slice(0, width);
  return ' '.repeat(width - text.length) + text;
};

const wrapText = (text: string, width: number) => {
  const lines: string[] = [];
  let remaining = text;
  while (remaining.length > width) {
    lines.push(remaining.slice(0, width));
    remaining = remaining.slice(width);
  }
  if (remaining.length) lines.push(remaining);
  return lines;
};

const buildReceiptText = (data: ReceiptData, paperWidth: '58' | '80' = '58') => {
  const RECEIPT_WIDTH = charsForWidth(paperWidth);
  const divider = '-'.repeat(RECEIPT_WIDTH);
  const lines: string[] = [];

  lines.push(centerText(data.restaurant, RECEIPT_WIDTH));
  lines.push(centerText(data.tableLabel, RECEIPT_WIDTH));
  if (data.headerLine) lines.push(centerText(data.headerLine, RECEIPT_WIDTH));
  if (data.dateLabel) lines.push(centerText(data.dateLabel, RECEIPT_WIDTH));
  if (data.paymentLabel) lines.push(centerText(`Payment: ${data.paymentLabel}`, RECEIPT_WIDTH));

  lines.push(divider);
  data.items.forEach((item) => {
    const itemTotal = formatMoney(item.price * item.quantity);
    const qty = `x${item.quantity}`;
    const nameWidth = Math.max(RECEIPT_WIDTH - qty.length - itemTotal.length - 2, 8);
    const nameLines = wrapText(item.name, nameWidth);
    nameLines.forEach((line, index) => {
      const namePart = padRight(line, nameWidth);
      const qtyPart = index === 0 ? qty : padRight('', qty.length);
      const totalPart = index === 0 ? itemTotal : '';
      lines.push(`${namePart} ${qtyPart} ${padLeft(totalPart, itemTotal.length)}`);
    });
  });
  lines.push(divider);

  const subtotal = formatMoney(data.subtotal);
  lines.push(padRight('Subtotal', RECEIPT_WIDTH - subtotal.length - 1) + ' ' + subtotal);
  if (data.taxEnabled) {
    const tax = formatMoney(data.tax);
    lines.push(padRight('Tax (7%)', RECEIPT_WIDTH - tax.length - 1) + ' ' + tax);
  }
  const total = formatMoney(data.total);
  lines.push(padRight('Total', RECEIPT_WIDTH - total.length - 1) + ' ' + total);
  lines.push('');
  lines.push(centerText('Please rate us on Google', RECEIPT_WIDTH));

  return lines.join('\n');
};

/**
 * Sends the receipt to the connected Bluetooth printer using ESC/POS.
 * Assumes the printer is already connected.
 */
const sendEscposReceipt = async (data: ReceiptData, paperWidth: '58' | '80') => {
  const mod = loadEscpos();
  if (!mod) return false;

  const { BluetoothEscposPrinter: P } = mod;
  const width = dotsForWidth(paperWidth);

  try {
    if (P.printerInit) await P.printerInit();
    if (P.setWidth) await P.setWidth(width);

    // Header — centered and enlarged
    if (P.printerAlign) await P.printerAlign(P.ALIGN?.CENTER ?? 1);
    if (P.printText) {
      await P.printText(data.restaurant + '\n', {
        encoding: 'UTF-8',
        codepage: 0,
        widthtimes: 1,
        heigthtimes: 1,
        fonttype: 1,
      });
    }
    if (P.printerAlign) await P.printerAlign(P.ALIGN?.LEFT ?? 0);

    // Body — normal size, left aligned
    const body = buildReceiptText(data, paperWidth);
    if (P.printText) {
      await P.printText(body + '\n', {
        encoding: 'UTF-8',
        codepage: 0,
        widthtimes: 0,
        heigthtimes: 0,
        fonttype: 0,
      });
    }

    if (P.printAndFeed) await P.printAndFeed(3);
    if (P.printText) await P.printText('\n\n\n', {});

    return true;
  } catch (err) {
    console.warn('[printer] ESC/POS send failed', err);
    return false;
  }
};

/**
 * Prints directly to the saved Bluetooth printer.
 * Returns false when no printer is configured or the connection fails,
 * so the caller can fall back to the system print dialog.
 */
export const printToBluetooth = async (data: ReceiptData): Promise<boolean> => {
  const saved = await getSavedPrinter();
  if (!saved) {
    console.log('[printer] no Bluetooth printer configured — skipping direct print');
    return false;
  }

  const mod = loadEscpos();
  if (!mod) return false;

  const permitted = await requestBluetoothPermissions();
  if (!permitted) {
    console.warn('[printer] Bluetooth permission not granted — cannot print directly');
    return false;
  }

  const connected = await connectPrinter(saved.address);
  if (!connected) return false;

  return await sendEscposReceipt(data, saved.width);
};

/* ------------------------------------------------------------------ *
 * Test print (used by the printer settings screen)
 * ------------------------------------------------------------------ */

export const printTestReceipt = async (): Promise<{ ok: boolean; message: string }> => {
  const saved = await getSavedPrinter();
  if (!saved) {
    return { ok: false, message: 'No printer selected yet.' };
  }

  const mod = loadEscpos();
  if (!mod) {
    return { ok: false, message: 'Bluetooth module not available in this build.' };
  }

  const permitted = await requestBluetoothPermissions();
  if (!permitted) {
    return { ok: false, message: 'Bluetooth permission denied.' };
  }

  const connected = await connectPrinter(saved.address);
  if (!connected) {
    return { ok: false, message: `Could not connect to ${saved.name}. Is it switched on and in range?` };
  }

  const sample: ReceiptData = {
    restaurant: 'PRINTER TEST',
    tableLabel: saved.name,
    dateLabel: new Date().toLocaleString(),
    items: [
      { name: 'Test item', quantity: 1, price: 100 },
      { name: 'Second item', quantity: 2, price: 50 },
    ],
    subtotal: 200,
    taxEnabled: true,
    tax: 14,
    total: 214,
  };

  const ok = await sendEscposReceipt(sample, saved.width);
  return {
    ok,
    message: ok ? 'Test receipt sent to the printer.' : 'Connected, but sending data failed.',
  };
};

/* ------------------------------------------------------------------ *
 * System print dialog fallback (HTML)
 * ------------------------------------------------------------------ */

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const buildReceiptHtml = (data: ReceiptData) => {
  const dateLabel = data.dateLabel ?? new Date().toLocaleString();
  const paymentLabel = data.paymentLabel ?? '';

  const itemRows = data.items
    .map((item) => {
      const name = escapeHtml(item.name);
      const qty = String(item.quantity);
      const amt = formatMoney(item.price * item.quantity);
      return (
        '<div class="row text">' +
        '<span>' +
        name +
        ' x' +
        qty +
        '</span>' +
        '<span>' +
        amt +
        '</span>' +
        '</div>'
      );
    })
    .join('');

  const css = [
    '@page { margin: 0; size: auto; }',
    'html, body {',
    '  margin: 0;',
    '  padding: 0;',
    '  width: 100%;',
    '  height: auto;',
    '  font-family: monospace;',
    '  background: white;',
    '}',
    '* { box-sizing: border-box; }',
    '.center { text-align: center; }',
    '.bold { font-weight: bold; }',
    '.receipt {',
    '  width: 100%;',
    '  padding: 30px;',
    '  box-sizing: border-box;',
    '  min-height: 1800px;',
    '}',
    '.title { font-size: 62px; font-weight: bold; }',
    '.subtitle { font-size: 42px; }',
    '.text { font-size: 42px; line-height: 1.6; }',
    '.total { font-size: 56px; font-weight: bold; }',
    '.line { border-top: 3px dashed black; margin: 25px 0; }',
    '.row { display: flex; justify-content: space-between; margin-bottom: 20px; }',
  ].join('\n');

  const paymentHtml = paymentLabel ? escapeHtml(paymentLabel) : '';

  return (
    '<html>' +
    '<head>' +
    '<meta name="viewport" content="width=device-width, initial-scale=1" />' +
    '<style>' +
    css +
    '</style>' +
    '</head>' +
    '<body>' +
    '<div class="receipt">' +
    '<div class="center title">' +
    escapeHtml(data.restaurant) +
    '</div>' +
    '<div class="center subtitle">Retail Invoice</div>' +
    '<div class="line"></div>' +
    '<div class="text">Date: ' +
    escapeHtml(dateLabel) +
    '</div>' +
    '<div class="text">' +
    escapeHtml(data.tableLabel) +
    '</div>' +
    '<div class="text">Payment: ' +
    (paymentHtml || '—') +
    '</div>' +
    '<div class="line"></div>' +
    '<div class="row bold text">' +
    '<span>Item</span>' +
    '<span>Amt</span>' +
    '</div>' +
    '<div class="line"></div>' +
    itemRows +
    '<div class="line"></div>' +
    '<div class="row text"><span>Subtotal</span><span>' +
    formatMoney(data.subtotal) +
    '</span></div>' +
    '<div class="row text"><span>Tax</span><span>' +
    (data.taxEnabled ? formatMoney(data.tax) : '0') +
    '</span></div>' +
    '<div class="line"></div>' +
    '<div class="row total"><span>TOTAL</span><span>' +
    formatMoney(data.total) +
    ' THB</span></div>' +
    '<div class="line"></div>' +
    '<div class="center text" style="margin-top:60px;">Thank You<br/>Visit Again</div>' +
    '</div>' +
    '</body>' +
    '</html>'
  );
};

/* ------------------------------------------------------------------ *
 * Public entry point used across the app
 *
 * Order of preference:
 *   1. Direct Bluetooth ESC/POS print to the saved printer
 *   2. Android system print dialog (expo-print) as a fallback
 * ------------------------------------------------------------------ */

export const printReceipt = async (data: ReceiptData) => {
  const printedDirectly = await printToBluetooth(data);
  if (printedDirectly) return;

  const html = buildReceiptHtml(data);
  await Print.printAsync({ html });
};

export { buildReceiptText, buildReceiptHtml };
