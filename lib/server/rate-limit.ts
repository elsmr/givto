import { createHash } from 'node:crypto';
import { getDb } from './db';
import { AppError } from './errors';

export interface RateLimitRule {
  /** Seconds. */
  window: number;
  max: number;
}

/**
 * Fixed-window counter in Mongo (43), shared by all serverless instances. Same shape as
 * Better Auth's `customStorage.consume`, so it backs Better Auth's limits too. Keys are
 * hashed: they may contain emails or IPs.
 */
export const consumeRateLimit = async (
  key: string,
  { window, max }: RateLimitRule
): Promise<{ allowed: boolean; retryAfter: number | null }> => {
  const { rateLimits } = await getDb();
  const now = new Date();
  const windowEnd = new Date(now.getTime() + window * 1000);
  const active = { $gt: ['$expiresAt', now] };
  const consume = () =>
    rateLimits.findOneAndUpdate(
      { _id: createHash('sha256').update(key).digest('base64url') },
      // One atomic update: count within the current window, or start a new one. The TTL
      // index removes expired counters only about once a minute, so check expiry here.
      [
        {
          $set: {
            count: { $cond: [active, { $add: ['$count', 1] }, 1] },
            expiresAt: { $cond: [active, '$expiresAt', windowEnd] },
          },
        },
      ],
      { upsert: true, returnDocument: 'after' }
    );
  // Two first requests can race on the upsert; the loser retries as an update.
  const counter = await consume().catch((error: { code?: number }) => {
    if (error.code === 11000) return consume();
    throw error;
  });
  if (!counter || counter.count <= max) return { allowed: true, retryAfter: null };
  return {
    allowed: false,
    retryAfter: Math.max(1, Math.ceil((counter.expiresAt.getTime() - now.getTime()) / 1000)),
  };
};

/** For procedures: throws RATE_LIMITED (with `retryAfter` seconds) when the limit is hit. */
export const enforceRateLimit = async (key: string, rule: RateLimitRule): Promise<void> => {
  const { allowed, retryAfter } = await consumeRateLimit(key, rule);
  if (!allowed) throw new AppError('RATE_LIMITED', { details: { retryAfter } });
};
