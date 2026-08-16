import React, { useRef } from 'react';
import { useTranslation } from '../../i18n';

export default function OtpInput({ value, onChange, disabled = false }) {
  const inputs = useRef([]);
  const { t } = useTranslation();
  const digits = value.padEnd(6, ' ').slice(0, 6).split('');

  function setDigit(index, input) {
    const digit = input.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit || ' ';
    onChange(next.join('').trimEnd());
    if (digit && index < 5) inputs.current[index + 1]?.focus();
  }
  function handleKeyDown(index, event) {
    if (event.key === 'Backspace' && !digits[index].trim() && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < 5) inputs.current[index + 1]?.focus();
  }
  function handlePaste(event) {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    inputs.current[Math.min(pasted.length, 5)]?.focus();
  }
  return <div dir="ltr" className="grid grid-cols-6 gap-2" onPaste={handlePaste}>{digits.map((digit, index) => <input key={index} ref={(node) => { inputs.current[index] = node; }} value={digit.trim()} onChange={(event) => setDigit(index, event.target.value)} onKeyDown={(event) => handleKeyDown(index, event)} disabled={disabled} inputMode="numeric" autoComplete={index === 0 ? 'one-time-code' : 'off'} maxLength="1" aria-label={t('auth.otpAccessible', { number: index + 1 })} className="h-12 min-w-0 rounded-xl border border-ink-900/15 bg-white text-center text-lg font-extrabold text-ink-900 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 disabled:bg-slate-100 sm:h-14" />)}</div>;
}
