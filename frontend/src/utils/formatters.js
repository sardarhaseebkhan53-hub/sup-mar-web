export function formatPrice(amount, currency = 'PKR') {
  if (amount == null) return 'Contact for price';
  const formatted = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(amount);
  return `${currency} ${formatted}`;
}

export function formatCompactNumber(value) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}
