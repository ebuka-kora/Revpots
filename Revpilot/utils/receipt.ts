import { Platform } from 'react-native';

import { formatCurrency } from './format';

export type ReceiptInvoice = {
  id: number;
  createdAt: string;
  totalAmount: number;
};

export type ReceiptItem = {
  productName: string;
  quantity: number;
  price: number;
};

export const formatReceiptDate = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const escapeHtml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function getReceiptHtml(invoice: ReceiptInvoice, items: ReceiptItem[]): string {
  const rows = items
    .map(
      (item) =>
        `<tr><td>${escapeHtml(item.productName)}</td><td style="text-align:center;">${item.quantity}</td><td style="text-align:right;">${formatCurrency(item.price)}</td><td style="text-align:right;">${formatCurrency(item.quantity * item.price)}</td></tr>`
    )
    .join('');
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"/><style>
*{margin:0;padding:0;box-sizing:border-box;}
body{
  font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;
  background:linear-gradient(135deg,#FFCBDA 0%,#C695B9 50%,#AF80A1 100%);
  padding:32px 24px;
  min-height:100vh;
  display:flex;
  flex-direction:column;
}
.container{
  background:rgba(255,255,255,0.95);
  border-radius:20px;
  padding:28px;
  box-shadow:0 8px 32px rgba(175,128,161,0.3);
  border:2px solid rgba(255,203,218,0.5);
}
.header{
  text-align:center;
  margin-bottom:24px;
  padding-bottom:20px;
  border-bottom:2px solid #FFCBDA;
}
.brand{
  font-size:32px;
  font-weight:bold;
  color:#AF80A1;
  text-shadow:2px 2px 4px rgba(175,128,161,0.3);
  margin-bottom:8px;
  letter-spacing:1px;
}
h1{
  font-size:18px;
  color:#C695B9;
  font-weight:600;
  margin-top:4px;
}
.meta{
  display:flex;
  justify-content:space-between;
  margin-bottom:20px;
  padding:12px 16px;
  background:linear-gradient(90deg,rgba(255,203,218,0.2),rgba(198,149,185,0.2));
  border-radius:12px;
  border-left:4px solid #C695B9;
}
.meta-item{
  font-size:13px;
  color:#5a5a5a;
}
.meta-label{
  font-weight:600;
  color:#AF80A1;
}
table{
  width:100%;
  border-collapse:collapse;
  margin-bottom:20px;
  border-radius:12px;
  overflow:hidden;
}
thead{
  background:linear-gradient(135deg,#C695B9,#AF80A1);
}
th{
  text-align:left;
  padding:12px 10px;
  font-size:13px;
  font-weight:600;
  color:#fff;
  text-transform:uppercase;
  letter-spacing:0.5px;
}
th:nth-child(2),th:nth-child(3),th:nth-child(4){text-align:right;}
tbody tr{
  border-bottom:1px solid rgba(198,149,185,0.2);
  transition:background 0.2s;
}
tbody tr:hover{
  background:rgba(255,203,218,0.1);
}
tbody tr:last-child{
  border-bottom:none;
}
td{
  padding:12px 10px;
  font-size:14px;
  color:#333;
}
.total-section{
  margin-top:16px;
  padding:16px;
  background:linear-gradient(135deg,rgba(255,203,218,0.3),rgba(198,149,185,0.3));
  border-radius:12px;
  border:2px solid #C695B9;
}
.total{
  font-size:20px;
  font-weight:bold;
  color:#AF80A1;
  text-align:right;
  text-shadow:1px 1px 2px rgba(175,128,161,0.2);
}
.footer{
  text-align:center;
  margin-top:20px;
  padding-top:16px;
  border-top:2px solid #FFCBDA;
  font-size:12px;
  color:#888;
}
</style></head><body>
<div class="container">
  <div class="header">
    <div class="brand">Omyre</div>
    <h1>Sales Receipt</h1>
  </div>
  <div class="meta">
    <div class="meta-item"><span class="meta-label">Invoice:</span> #${invoice.id}</div>
    <div class="meta-item"><span class="meta-label">Date:</span> ${formatReceiptDate(invoice.createdAt)}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th style="text-align:center;">Qty</th>
        <th style="text-align:right;">Price</th>
        <th style="text-align:right;">Subtotal</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total-section">
    <div class="total">Total: ${formatCurrency(invoice.totalAmount)}</div>
  </div>
  <div class="footer">Thank you for your business!</div>
</div>
</body></html>`;
}

/**
 * Generate receipt image from HTML on web using html2canvas.
 */
async function generateReceiptImageWeb(html: string, invoiceId: number): Promise<File | null> {
  try {
    const html2canvas = (await import('html2canvas')).default;

    // Create a temporary container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '400px';
    container.style.background = '#fff';

    // Create an iframe to render the HTML
    const iframe = document.createElement('iframe');
    iframe.style.width = '400px';
    iframe.style.height = 'auto';
    iframe.style.border = 'none';
    container.appendChild(iframe);
    document.body.appendChild(container);

    // Write HTML to iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      document.body.removeChild(container);
      return null;
    }
    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Wait for content to render
    await new Promise((r) => setTimeout(r, 100));

    // Adjust iframe height to content
    const body = iframeDoc.body;
    iframe.style.height = `${body.scrollHeight}px`;

    // Capture as canvas
    const canvas = await html2canvas(body, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    // Clean up
    document.body.removeChild(container);

    // Convert canvas to blob
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png', 1.0)
    );
    if (!blob) return null;

    return new File([blob], `receipt-${invoiceId}.png`, { type: 'image/png' });
  } catch (e) {
    console.warn('Failed to generate receipt image:', e);
    return null;
  }
}

/**
 * Share receipt as image (web) or PDF (native).
 */
export async function shareReceipt(invoice: ReceiptInvoice, items: ReceiptItem[]): Promise<void> {
  const html = getReceiptHtml(invoice, items);

  if (Platform.OS === 'web') {
    const nav = typeof navigator !== 'undefined' ? navigator : null;

    // Try to generate and share as image
    const imageFile = await generateReceiptImageWeb(html, invoice.id);

    if (imageFile && nav?.share && nav.canShare?.({ files: [imageFile] })) {
      try {
        await nav.share({
          title: `Receipt #${invoice.id}`,
          files: [imageFile],
        });
        return;
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return;
      }
    }

    // Fallback: Try sharing text
    if (nav?.share) {
      try {
        await nav.share({
          title: `Receipt #${invoice.id}`,
          text: `Sales Receipt\nInvoice #${invoice.id}\nTotal: ${formatCurrency(invoice.totalAmount)}`,
        });
        return;
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return;
      }
    }

    // Last fallback: copy to clipboard
    if (typeof navigator?.clipboard?.writeText === 'function') {
      await navigator.clipboard.writeText(
        `Sales Receipt - Invoice #${invoice.id}\nTotal: ${formatCurrency(invoice.totalAmount)}`
      );
    }
    return;
  }

  // Native: Generate PDF and share
  try {
    const Print = await import('expo-print');
    const Sharing = await import('expo-sharing');
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Receipt #${invoice.id}`,
        UTI: 'com.adobe.pdf',
      });
    }
  } catch (e) {
    console.warn('Receipt share not available', e);
    throw e;
  }
}
