import { querySql } from './database';

type MonthlyReport = {
  totalSales: number;
  totalProfit: number;
  totalInvoices: number;
};

const padMonth = (value: number) => String(value).padStart(2, '0');

const getMonthRange = (month: number, year: number) => {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    label: `${year}-${padMonth(month)}`,
  };
};

export const getMonthlyReport = async (
  month: number,
  year: number
): Promise<MonthlyReport> => {
  const { startIso, endIso } = getMonthRange(month, year);

  const salesRows = (await querySql(
    `SELECT
       COALESCE(SUM(totalAmount), 0) AS totalSales,
       COUNT(*) AS totalInvoices
     FROM invoices
     WHERE createdAt >= ? AND createdAt < ?`,
    [startIso, endIso]
  )) as { totalSales: number; totalInvoices: number }[];

  const profitRows = (await querySql(
    `SELECT
       COALESCE(SUM((invoice_items.price - products.costPrice) * invoice_items.quantity), 0) AS totalProfit
     FROM invoice_items
     JOIN products ON products.id = invoice_items.productId
     JOIN invoices ON invoices.id = invoice_items.invoiceId
     WHERE invoices.createdAt >= ? AND invoices.createdAt < ?`,
    [startIso, endIso]
  )) as { totalProfit: number }[];

  const totalSales = Number(salesRows[0]?.totalSales ?? 0);
  const totalInvoices = Number(salesRows[0]?.totalInvoices ?? 0);
  const totalProfit = Number(profitRows[0]?.totalProfit ?? 0);

  return {
    totalSales,
    totalProfit,
    totalInvoices,
  };
};
