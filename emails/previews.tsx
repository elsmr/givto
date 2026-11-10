/** @jsxImportSource react */
import type { ReactElement } from 'react';
import type { Locale } from '../lib/schema/common';
import { AnswerEmail, answerSubject } from './answer';
import { DeleteAccountEmail, deleteAccountSubject } from './delete-account';
import { GifteeChangedEmail, gifteeChangedSubject } from './giftee-changed';
import { GroupDeletionEmail, groupDeletionSubject } from './group-deletion';
import { InviteEmail, inviteSubject } from './invite';
import { JoinReminderEmail, joinReminderSubject } from './join-reminder';
import { JoinDigestEmail, joinDigestSubject } from './join-digest';
import { JoinRequestEmail, joinRequestSubject } from './join-request';
import { JoinedEmail, joinedSubject } from './joined';
import { NamesDrawnEmail, namesDrawnSubject } from './names-drawn';
import { OrganizerHandoverEmail, organizerHandoverSubject } from './organizer-handover';
import { PsstEmail, psstSubject } from './psst';
import { QuestionEmail, questionSubject } from './question';
import { ReminderGiftDayEmail, reminderGiftDaySubject } from './reminder-gift-day';
import { ReminderEmail, reminderSubject, type ReminderParts } from './reminder';
import { SignInEmail, signInSubject } from './sign-in';
import type { UnsubscribeCategory } from './ui/categories';
import { formatLocalDate } from './ui/format-date';
import { WishlistUpdatedEmail, wishlistUpdatedSubject } from './wishlist-updated';

export interface EmailPreview {
  name: string;
  subject: string;
  body: ReactElement;
  /** The main link: must survive into the plain-text part. */
  url?: string;
  /** Text that must appear nowhere (anonymity, privacy). */
  mustNotContain?: string[];
}

/** Every template with sample data, for tests/emails.check.mjs and design previews. */
export const emailPreviews = (locale: Locale): EmailPreview[] => {
  const group = 'Family';
  const url = 'https://givto.example/g/family123';
  const unsubscribe = (category: UnsubscribeCategory) => ({
    url: `https://givto.example/unsubscribe?t=sample-${category}`,
    category,
  });
  const base = { locale, group, url };
  const giftDay = formatLocalDate('2026-12-18', locale);
  const postBy = formatLocalDate('2026-12-12', locale);
  const santa = ['Olive', 'olive@example.com'];
  const wishlist = { url: 'https://givto.example/wishlist', by: formatLocalDate('2026-12-04', locale) };
  const gift = { url: `${url}#giftee`, giftDay };
  const reminder = (name: string, parts: ReminderParts, forName?: string): EmailPreview => {
    const props = { ...base, ...parts, forName, unsubscribe: unsubscribe('reminders') };
    return { name, subject: reminderSubject(props), body: <ReminderEmail {...props} />, url: Object.values(parts)[0].url };
  };
  return [
    { name: 'sign-in', subject: signInSubject(locale), body: <SignInEmail locale={locale} otp="482913" url="https://givto.example/auth/link#t=abc" />, url: 'https://givto.example/auth/link#t=abc' },
    { name: 'delete-account', subject: deleteAccountSubject(locale), body: <DeleteAccountEmail locale={locale} code="771204" /> },
    { name: 'invite', subject: inviteSubject({ locale, organizer: 'Olive', group }), body: <InviteEmail {...base} name="Ann" organizer="Olive" />, url },
    { name: 'join-reminder', subject: joinReminderSubject({ locale, group }), body: <JoinReminderEmail {...base} name="Ann" organizer="Olive" />, url },
    { name: 'join-request', subject: joinRequestSubject({ locale, name: 'Bob', group }), body: <JoinRequestEmail {...base} name="Bob" />, url },
    { name: 'joined', subject: joinedSubject(base), body: <JoinedEmail {...base} />, url },
    { name: 'names-drawn', subject: namesDrawnSubject(base), body: <NamesDrawnEmail {...base} giftDay={giftDay} budget="€25" />, url, mustNotContain: ['Ann'] },
    { name: 'names-drawn-managed', subject: namesDrawnSubject(base), body: <NamesDrawnEmail {...base} forName="Kid" />, url },
    { name: 'giftee-changed', subject: gifteeChangedSubject(base), body: <GifteeChangedEmail {...base} />, url },
    { name: 'organizer-handover', subject: organizerHandoverSubject(base), body: <OrganizerHandoverEmail {...base} />, url },
    { name: 'psst-empty', subject: psstSubject(base), body: <PsstEmail {...base} kind="emptyWishlist" unsubscribe={unsubscribe('santaMessages')} />, url, mustNotContain: santa },
    { name: 'psst-details', subject: psstSubject(base), body: <PsstEmail {...base} kind="moreDetails" forName="Kid" unsubscribe={unsubscribe('santaMessages')} />, url, mustNotContain: santa },
    { name: 'question', subject: questionSubject(base), body: <QuestionEmail {...base} question={'What size are your feet?\nEU sizes please'} unsubscribe={unsubscribe('santaMessages')} />, url, mustNotContain: santa },
    { name: 'answer', subject: answerSubject(base), body: <AnswerEmail {...base} question="What size are your feet?" answer="39, and I love green socks" unsubscribe={unsubscribe('wishlistUpdates')} />, url },
    {
      name: 'wishlist-updated',
      subject: wishlistUpdatedSubject(base),
      body: <WishlistUpdatedEmail {...base} added={['Moomin mug', 'Green socks', 'A good novel']} updated={['Headphones']} unsubscribe={unsubscribe('wishlistUpdates')} />,
      url,
    },
    reminder('reminder-wishlist', { wishlist }),
    reminder('reminder-wishlist-managed', { wishlist: { url } }, 'Kid'),
    reminder('reminder-gift', { gift }),
    reminder('reminder-post', { gift: { ...gift, postBy } }),
    reminder('reminder-combined', { wishlist, gift }),
    reminder('reminder-ready', { readyToDraw: { url, people: 6, giftDay, soon: false } }),
    reminder('reminder-ready-soon', { wishlist, readyToDraw: { url, people: 6, giftDay, soon: true } }),
    {
      name: 'join-digest',
      subject: joinDigestSubject({ ...base, names: ['Bob', 'Cee'] }),
      body: <JoinDigestEmail {...base} url={`${url}#people`} names={['Bob', 'Cee']} people={7} unsubscribe={unsubscribe('joins')} />,
      url: `${url}#people`,
    },
    { name: 'join-digest-one', subject: joinDigestSubject({ ...base, names: ['Bob'] }), body: <JoinDigestEmail {...base} names={['Bob']} people={4} unsubscribe={unsubscribe('joins')} />, url },
    { name: 'reminder-gift-day', subject: reminderGiftDaySubject(base), body: <ReminderGiftDayEmail {...base} time="19:30" place="Grandma's place" unsubscribe={unsubscribe('reminders')} />, url },
    { name: 'group-deletion', subject: groupDeletionSubject({ ...base, date: giftDay }), body: <GroupDeletionEmail {...base} date={giftDay} months={24} />, url },
  ];
};
