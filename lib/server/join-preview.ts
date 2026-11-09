import * as v from 'valibot';
import { JoinLink, Slug, type Group } from '../schema/group';
import type { Invite } from '../schema/invite';
import type { Collections } from './db';
import { firstName, hashToken, organizerOf } from './membership';

const JoinToken = JoinLink.entries.token;
const InviteToken = v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{16,64}$/));

/** A group whose join link is live. Unknown, revoked and expired links all look the same. */
export const findGroupByJoinLink = async (db: Collections, slug: unknown, token: unknown) => {
  if (!v.is(Slug, slug) || !v.is(JoinToken, token)) return null;
  const group = await db.groups.findOne({
    slug,
    'joinLink.token': token,
    'joinLink.revoked': false,
    deletedAt: { $exists: false },
    archivedAt: { $exists: false },
  });
  const expiresAt = group?.joinLink?.expiresAt;
  return group && (!expiresAt || expiresAt > new Date()) ? group : null;
};

/** An unused, unexpired email invite to this group. */
export const findPendingInvite = async (
  db: Collections,
  slug: unknown,
  token: unknown
): Promise<{ group: Group; invite: Invite } | null> => {
  if (!v.is(Slug, slug) || !v.is(InviteToken, token)) return null;
  const invite = await db.invites.findOne({
    tokenHash: hashToken(token),
    usedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  });
  if (!invite) return null;
  const group = await db.groups.findOne({ _id: invite.groupId, slug, deletedAt: { $exists: false } });
  return group ? { group, invite } : null;
};

/** What a link holder may see before joining: no member list (45). */
export type JoinPreview = {
  groupName: string;
  organizerFirstName: string;
  requiresApproval: boolean;
  /** Email invites are bound to one address. */
  invite?: { email: string; name: string };
};

export const joinLinkPreview = (group: Group): JoinPreview => ({
  groupName: group.name,
  organizerFirstName: firstName(organizerOf(group)?.name ?? ''),
  requiresApproval: group.joinLink?.requiresApproval ?? false,
});

export const invitePreview = ({ group, invite }: { group: Group; invite: Invite }): JoinPreview => ({
  ...joinLinkPreview(group),
  requiresApproval: false,
  invite: {
    email: invite.email,
    name: group.members.find((m) => m.id === invite.memberId)?.name ?? '',
  },
});
