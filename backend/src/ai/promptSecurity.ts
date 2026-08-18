const INJECTION = [
  /ignore (all )?(previous|prior|above) (instructions|prompts)/i,
  /you are now /i,
  /system prompt/i,
  /reveal .{0,40}(secret|api key|token|password)/i,
  /act as (an? )?(admin|root|developer)/i,
  /disable (safety|guard|filter)/i,
  /tool permissions/i,
  /call (the )?(admin|refund|suspend)/i,
];

const SENSITIVE_ACTIONS = [
  /refund/i,
  /approve (this )?listing/i,
  /publish (this )?listing/i,
  /suspend (the )?user/i,
  /ban (the )?user/i,
  /change (the )?price/i,
  /activate (the )?promotion/i,
  /change admin/i,
  /grant (admin|permission)/i,
];

export function sanitizeUserText(input: unknown, max = 2000) {
  return String(input || '').split('').filter((char) => {
    const code = char.charCodeAt(0);
    return code === 9 || code === 10 || code === 13 || code >= 32;
  }).join('').trim().slice(0, max);
}

export function detectPromptInjection(text: string) {
  return INJECTION.some((pattern) => pattern.test(text));
}

export function detectSensitiveAction(text: string) {
  return SENSITIVE_ACTIONS.some((pattern) => pattern.test(text));
}

export function wrapUntrusted(text: string) {
  return `<user_message>\n${text.replace(/<\/?user_message>/gi, '')}\n</user_message>`;
}

export function looksLikeSecretProbe(text: string) {
  return /api[_-]?key|jwt|secret|password|otp|card number|cvv/i.test(text) && /(show|give|print|reveal|what is)/i.test(text);
}
