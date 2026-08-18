const CURRENCY_LABELS = Object.freeze({ PKR: 'Rs.' });

export function formatPrice(amount, currency = 'PKR', options = {}) {
  if (amount == null) return 'Contact for price';
  const formatted = new Intl.NumberFormat('en-PK', { minimumFractionDigits: options.minimumFractionDigits || 0, maximumFractionDigits: options.maximumFractionDigits ?? 0 }).format(Number(amount));
  return `${CURRENCY_LABELS[currency] || currency} ${formatted}`;
}

export const formatCurrency = formatPrice;

export function formatCompactNumber(value) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}
