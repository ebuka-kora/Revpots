import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { formatCurrency } from './format';

type ReceiptInvoice = {
  id: number;
  createdAt: string;
  totalAmount: number;
};

type ReceiptItem = {
  productName: string;
  quantity: number;
  price: number;
};

const formatDate = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};


const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const generateReceipt = async (
  invoice: ReceiptInvoice,
  items: ReceiptItem[]
) => {
  const rows = items
    .map((item) => {
      const subtotal = item.quantity * item.price;
      return `
        <tr>
          <td>${escapeHtml(item.productName)}</td>
          <td>${item.quantity}</td>
          <td>${formatCurrency(item.price)}</td>
          <td>${formatCurrency(subtotal)}</td>
        </tr>
      `;
    })
    .join('');

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #111;
            padding: 24px;
          }
          h1 {
            font-size: 20px;
            margin-bottom: 12px;
          }
          .meta {
            font-size: 14px;
            margin-bottom: 16px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 16px;
          }
          th, td {
            text-align: left;
            padding: 8px;
            border-bottom: 1px solid #ddd;
            font-size: 13px;
          }
          th {
            background: #f5f5f5;
          }
          .total {
            font-size: 16px;
            font-weight: bold;
            text-align: right;
          }
        </style>
      </head>
      <body>
        <h1>Sales Receipt</h1>
        <div class="meta">Invoice #${invoice.id}</div>
        <div class="meta">Date: ${formatDate(invoice.createdAt)}</div>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <div class="total">Total: ${formatCurrency(invoice.totalAmount)}</div>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri);
  }
};
