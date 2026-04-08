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

const buildReceiptHtml = (data: ReceiptData) => {
  const itemLines = data.items
    .map(
      (item) =>
        `${item.name} x${item.quantity}  ${formatMoney(item.price * item.quantity)}`
    )
    .join('<br/>');

  return `
    <html>
      <body style="font-family: 'Helvetica'; padding: 16px;">
        <div style="text-align: center; font-weight: bold;">${data.restaurant}</div>
        <div style="text-align: center;">${data.tableLabel}</div>
        ${data.headerLine ? `<div style="text-align: center;">${data.headerLine}</div>` : ''}
        <hr/>
        <div>${itemLines}</div>
        <hr/>
        <div>Subtotal: ${formatMoney(data.subtotal)}</div>
        ${data.taxEnabled ? `<div>Tax (7%): ${formatMoney(data.tax)}</div>` : ''}
        <div style="font-weight: bold;">Total: ${formatMoney(data.total)}</div>
      </body>
    </html>
  `;
};

const tryBluetoothPrint = async (text: string) => {
  const printerAddress = process.env.EXPO_PUBLIC_BLUETOOTH_PRINTER_ADDRESS;
  if (!printerAddress) return false;

  try {
    // eslint-disable-next-line import/no-unresolved, @typescript-eslint/no-var-requires
    const module = require('react-native-bluetooth-escpos-printer');
    const BluetoothManager = module?.BluetoothManager;
    const BluetoothEscposPrinter = module?.BluetoothEscposPrinter;

    if (!BluetoothManager || !BluetoothEscposPrinter) return false;

    if (BluetoothManager.enableBluetooth) {
      await BluetoothManager.enableBluetooth();
    }
    if (BluetoothManager.connect) {
      await BluetoothManager.connect(printerAddress);
    }
    if (BluetoothEscposPrinter.printText) {
      await BluetoothEscposPrinter.printText(text, {});
      return true;
    }
  } catch (error) {
    console.warn('Bluetooth print unavailable:', error);
  }

  return false;
};

export const printReceipt = async (data: ReceiptData) => {
  const text = buildReceiptText(data);
  const printed = await tryBluetoothPrint(text);
  if (printed) return;

  const html = buildReceiptHtml(data);
  await Print.printAsync({ html });
};
