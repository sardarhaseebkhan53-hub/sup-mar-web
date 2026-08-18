import { env } from '../config/env.js';

type Bucket = { minute: number; day: number; minuteAt: number; dayAt: number };
const buckets = new Map<string, Bucket>();

export function resetAiRateLimits() { buckets.clear(); }

export function checkAiRateLimit(key: string, limits = { perMinute: env.ai.perMinute, perDay: env.ai.perDay }) {
  const now = Date.now();
  const current = buckets.get(key) || { minute: 0, day: 0, minuteAt: now, dayAt: now };
  if (now - current.minuteAt >= 60_000) { current.minute = 0; current.minuteAt = now; }
  if (now - current.dayAt >= 86_400_000) { current.day = 0; current.dayAt = now; }
  const perMinute = env.nodeEnv === 'test' ? Math.max(limits.perMinute, 200) : limits.perMinute;
  const perDay = env.nodeEnv === 'test' ? Math.max(limits.perDay, 1000) : limits.perDay;
  if (current.minute >= perMinute) return { ok: false, scope: 'minute' as const };
  if (current.day >= perDay) return { ok: false, scope: 'day' as const };
  current.minute += 1;
  current.day += 1;
  buckets.set(key, current);
  return { ok: true as const, remainingMinute: perMinute - current.minute, remainingDay: perDay - current.day };
}

export function checkAiRateLimitStrict(key: string, limits: { perMinute: number; perDay: number }) {
  const now = Date.now();
  const current = buckets.get(key) || { minute: 0, day: 0, minuteAt: now, dayAt: now };
  if (now - current.minuteAt >= 60_000) { current.minute = 0; current.minuteAt = now; }
  if (now - current.dayAt >= 86_400_000) { current.day = 0; current.dayAt = now; }
  if (current.minute >= limits.perMinute) return { ok: false, scope: 'minute' as const };
  if (current.day >= limits.perDay) return { ok: false, scope: 'day' as const };
  current.minute += 1;
  current.day += 1;
  buckets.set(key, current);
  return { ok: true as const };
}
