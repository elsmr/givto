import * as v from 'valibot';

/**
 * `rateLimits` collection: fixed-window counters (43). `_id` is the limit key, e.g.
 * `sign-in:email:<hash>`; the document expires via TTL at the end of its window.
 */
export const RateLimitCounter = v.object({
  _id: v.string(),
  count: v.pipe(v.number(), v.integer()),
  expiresAt: v.date(),
});
export type RateLimitCounter = v.InferOutput<typeof RateLimitCounter>;
