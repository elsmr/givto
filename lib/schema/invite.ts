import * as v from 'valibot';
import { Email, Id } from './common';

/**
 * `invites` collection: email invites (secondary to the join link, 45). Single-use token,
 * bound to the invited email, 7 days; only its SHA-256 hash is stored. Expires via TTL.
 */
export const Invite = v.object({
  _id: Id,
  groupId: Id,
  memberId: Id,
  email: Email,
  tokenHash: v.string(),
  createdAt: v.date(),
  expiresAt: v.date(),
  usedAt: v.optional(v.date()),
});
export type Invite = v.InferOutput<typeof Invite>;
