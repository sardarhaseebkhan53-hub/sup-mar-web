import { AppError } from './AppError.js';

export function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError(422, 'Enter a valid email address', 'INVALID_EMAIL');
  return email;
}

export function normalizePhone(value) {
  let phone = String(value || '').replace(/[\s()-]/g, '');
  if (phone.startsWith('03') && phone.length === 11) phone = `+92${phone.slice(1)}`;
  else if (phone.startsWith('92')) phone = `+${phone}`;
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new AppError(422, 'Enter a valid phone number including country code', 'INVALID_PHONE');
  return phone;
}

export function normalizeIdentifier(value) {
  const identifier = String(value || '').trim();
  return identifier.includes('@') ? normalizeEmail(identifier) : normalizePhone(identifier);
}

export function createUsername(name, suffix = '') {
  const base = String(name || 'member').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '').slice(0, 28) || 'member';
  return `${base}${suffix ? `.${suffix}` : ''}`.slice(0, 40);
}
