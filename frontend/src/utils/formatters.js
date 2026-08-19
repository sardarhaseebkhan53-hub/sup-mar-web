/**
 * Formatting helpers.
 *
 * The active locale is published by the i18n provider so that every existing
 * `formatPrice(...)` call site localizes automatically. Digits stay Latin in both
 * languages — that is what Pakistani users expect for prices — while the currency
 * label and its position follow the reading direction.
 */
const CURRENCY_LABELS = Object.freeze({
  en: { PKR: 'Rs.' },
  ur: { PKR: 'روپے' },
});
const UNSET_PRICE = Object.freeze({ en: 'Contact for price', ur: 'قیمت کے لیے رابطہ کریں' });

let activeLocale = 'en';

/** Called by the i18n provider whenever the language changes. */
export function setFormatterLocale(locale) {
  activeLocale = locale === 'ur' ? 'ur' : 'en';
}

export function getFormatterLocale() {
  return activeLocale;
}

export function formatPrice(amount, currency = 'PKR', options = {}) {
  const locale = options.locale === 'ur' || options.locale === 'en' ? options.locale : activeLocale;
  if (amount == null) return UNSET_PRICE[locale];
  const formatted = new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: options.minimumFractionDigits || 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 0,
  }).format(Number(amount));
  const label = CURRENCY_LABELS[locale][currency] || currency;
  // Urdu reads right-to-left, so the currency label trails the amount.
  return locale === 'ur' ? `${formatted} ${label}` : `${label} ${formatted}`;
}

export const formatCurrency = formatPrice;

export function formatCompactNumber(value) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

/** Locale-aware short date, consistent across the marketplace, seller and admin surfaces. */
export function formatDate(value, options = {}) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const locale = options.locale || (activeLocale === 'ur' ? 'ur-PK' : 'en-PK');
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric', ...options }).format(date);
}
