import { InviteFlow } from '@/components/join/invite-flow';
import { JoinFlow } from '@/components/join/join-flow';
import { JoinMeta } from '@/components/join/join-meta';
import { JoinUnavailable } from '@/components/join/join-unavailable';
import { AppShell } from '@/components/shell/app-shell';
import { getDb } from '@/lib/server/db';
import { requireEnv } from '@/lib/server/env';
import { preferredLocale } from '@/lib/server/locale';
import { currentEdition } from '@/lib/server/membership';
import {
  findGroupByJoinLink,
  findPendingInvite,
  invitePreview,
  joinLinkPreview,
  type JoinPreview,
} from '@/lib/server/join-preview';
import { loadMessages } from '@/messages/load';
import type { GetServerSideProps } from 'next';

type JoinPageProps = {
  slug: string;
  /** `?token=` (group link) or `?invite=` (email invite). */
  token: string | null;
  kind: 'link' | 'invite';
  preview: JoinPreview | null;
  origin: string;
};

// The only server-rendered private page: chat apps read the preview meta without running JS (37, 45).
export default function JoinPage({ slug, token, kind, preview, origin }: JoinPageProps) {
  return (
    <AppShell>
      <JoinMeta preview={preview} origin={origin} />
      {!token || !preview ? (
        <JoinUnavailable kind={kind} />
      ) : preview.invite ? (
        <InviteFlow slug={slug} token={token} preview={{ ...preview, invite: preview.invite }} />
      ) : (
        <JoinFlow slug={slug} token={token} preview={preview} />
      )}
    </AppShell>
  );
}

const asString = (value: unknown) => (typeof value === 'string' ? value : null);

export const getServerSideProps: GetServerSideProps<JoinPageProps> = async ({ params, query, req, res }) => {
  const slug = asString(params?.slug) ?? '';
  const invite = asString(query.invite);
  const token = invite ?? asString(query.token);
  const db = await getDb();
  const found = invite ? await findPendingInvite(db, slug, invite) : null;
  const group = !invite && token ? await findGroupByJoinLink(db, slug, token) : null;
  const preview = found ? invitePreview(found) : group ? joinLinkPreview(group) : null;
  const groupId = found?.group._id ?? group?._id;
  const edition = groupId ? await currentEdition(db, groupId) : null;
  const upcoming = edition?.status === 'done' ? null : edition;
  // Chat apps fetch the preview without our cookie and maybe without a language: the group's then.
  const headers = new Headers({ cookie: req.headers.cookie ?? '', 'accept-language': req.headers['accept-language'] ?? '' });
  const locale = preferredLocale(headers, found?.group.locale ?? group?.locale);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  return {
    props: {
      slug,
      token,
      kind: invite ? 'invite' : 'link',
      preview: preview && { ...preview, giftDay: upcoming?.giftDay?.date ?? null, budget: upcoming?.budget ?? null },
      origin: new URL(requireEnv('BETTER_AUTH_URL')).origin,
      locale,
      messages: await loadMessages(locale, ['join', 'group']),
    },
  };
};
