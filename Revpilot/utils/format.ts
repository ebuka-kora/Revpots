export const formatCurrency = (amount: number) => {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(safeAmount);
  } catch (error) {
    return `₦${safeAmount.toFixed(2)}`;
  }
};
