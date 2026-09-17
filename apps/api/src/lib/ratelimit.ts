import type { Env } from '../types';
import { ApiError } from './errors';

/**
 * Naive fixed-window rate limiter. In-isolate counters reset on deploy and
 * per-colo, which is acceptable for demo; in production pair with Cloudflare
 * WAF rate-limiting rules on /api/checkout, /api/reviews, /api/newsletter.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(_env: Env, key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  b.count += 1;
  if (b.count > limit) {
    throw ApiError.tooMany();
  }
}

export function clientIp(req: Request): string {
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-forwarded-for') ?? 'local';
}
