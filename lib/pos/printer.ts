import * as Print from 'expo-print';

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

const formatMoney = (value: number) => value.toFixed(2);

const RECEIPT_WIDTH = 32; // 58mm ~ 32 chars

const centerText = (text: string) => {
  if (text.length >= RECEIPT_WIDTH) return text;
  const pad = Math.floor((RECEIPT_WIDTH - text.length) / 2);
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

const buildReceiptText = (data: ReceiptData) => {
  const lines: string[] = [];
  lines.push(centerText(data.restaurant));
  lines.push(centerText(data.tableLabel));
  if (data.headerLine) {
    lines.push(centerText(data.headerLine));
  }
  if (data.dateLabel) {
    lines.push(centerText(data.dateLabel));
  }
  if (data.paymentLabel) {
    lines.push(centerText(`Payment: ${data.paymentLabel}`));
  }
  lines.push('-------------------------------');
  data.items.forEach((item) => {
    const itemTotal = formatMoney(item.price * item.quantity);
    const qty = `x${item.quantity}`;
    const nameWidth = RECEIPT_WIDTH - qty.length - itemTotal.length - 2;
    const nameLines = wrapText(item.name, nameWidth);
    nameLines.forEach((line, index) => {
      const namePart = padRight(line, nameWidth);
      const qtyPart = index === 0 ? qty : padRight('', qty.length);
      const totalPart = index === 0 ? itemTotal : '';
      lines.push(`${namePart} ${qtyPart} ${padLeft(totalPart, itemTotal.length)}`);
    });
  });
  lines.push('-------------------------------');
  lines.push(padRight('Subtotal', RECEIPT_WIDTH - formatMoney(data.subtotal).length - 1) + ' ' + formatMoney(data.subtotal));
  if (data.taxEnabled) {
    lines.push(padRight('Tax (7%)', RECEIPT_WIDTH - formatMoney(data.tax).length - 1) + ' ' + formatMoney(data.tax));
  }
  lines.push(padRight('Total', RECEIPT_WIDTH - formatMoney(data.total).length - 1) + ' ' + formatMoney(data.total));
  lines.push('');
  lines.push(centerText('Please rate us on Google'));
  return lines.join('\n');
};

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
      '  min-height: 1800px;', // forces long receipt so Android doesn't shrink content
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

const tryBluetoothPrint = async (text: string) => {
  const printerAddress = process.env.EXPO_PUBLIC_BLUETOOTH_PRINTER_ADDRESS?.trim();
  if (!printerAddress) {
    console.log('Bluetooth printer: no EXPO_PUBLIC_BLUETOOTH_PRINTER_ADDRESS set — skipping Bluetooth route');
    return false;
  }

  console.log(`Bluetooth printer: address=${printerAddress}, attempting print...`);

  // The react-native-bluetooth-escpos-printer package must be installed
  // and the app built as a dev client / standalone APK (not Expo Go).
  let BluetoothManager: any = null;
  let BluetoothEscposPrinter: any = null;

  try {
    const mod = require('react-native-bluetooth-escpos-printer');
    BluetoothManager = mod?.BluetoothManager ?? null;
    BluetoothEscposPrinter = mod?.BluetoothEscposPrinter ?? null;
  } catch (importErr) {
    console.warn(
      'Bluetooth print skipped: react-native-bluetooth-escpos-printer not found.',
      'Install it and build a dev client. Falling back to system print dialog.',
      importErr
    );
    return false;
  }

  if (!BluetoothManager || !BluetoothEscposPrinter) {
    console.warn(
      'Bluetooth print skipped: module loaded but BluetoothManager/BluetoothEscposPrinter missing.'
    );
    return false;
  }

  try {
    if (BluetoothManager.enableBluetooth) {
      await BluetoothManager.enableBluetooth();
    }
    if (BluetoothManager.connect) {
      await BluetoothManager.connect(printerAddress);
    }
    if (BluetoothEscposPrinter.printText) {
      await BluetoothEscposPrinter.printText(text, {});
      console.log('Bluetooth print succeeded');
      return true;
    }
  } catch (error) {
    console.warn('Bluetooth print failed:', error);
  }

  console.log('Bluetooth print unavailable — falling back to system print dialog');
  return false;
};

export const printReceipt = async (data: ReceiptData) => {
  const text = buildReceiptText(data);
  const printed = await tryBluetoothPrint(text);
  if (printed) return;

  const html = buildReceiptHtml(data);
  await Print.printAsync({ html });
};
