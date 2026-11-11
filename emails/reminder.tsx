/** @jsxImportSource react */
import { Fragment } from 'react';
import type { Locale } from '../lib/schema/common';
import { Button } from './ui/button';
import { EmailLayout } from './ui/layout';
import type { NoticeProps } from './ui/props';
import { Text } from './ui/text';
import { emailTranslator, type EmailTranslator } from './ui/translator';

/** The parts a reminder (63) can have; dates are formatted. Each has its own button. */
export interface ReminderParts {
  wishlist?: { url: string; by?: string };
  /** Posted exchanges (80): add your postal address. */
  address?: { url: string; postBy?: string };
  /** `postBy`: a posted exchange. `whiteElephant` (88): bring one gift, nobody to shop for. */
  gift?: { url: string; giftDay: string; postBy?: string; whiteElephant?: boolean };
  /** To the organizer drawing by hand (`lockIn`: locking in, for kinds without a draw). `soon`: gift day is two weeks off (else: everyone invited is in). */
  readyToDraw?: { url: string; people: number; giftDay?: string; soon: boolean; lockIn?: boolean };
}
type ReminderProps = NoticeProps & ReminderParts;

const partSubjects = (t: EmailTranslator, { wishlist, address, gift, readyToDraw }: ReminderParts) =>
  [
    wishlist && t('reminder.wishlist.subject'),
    address && t('reminder.address.subject'),
    gift && (gift.postBy ? t('reminder.gift.subject-post', { date: gift.postBy }) : gift.whiteElephant ? t('reminder.bring.subject') : t('reminder.gift.subject')),
    readyToDraw && (readyToDraw.lockIn ? t('reminder.lock-in.subject') : t('reminder.ready.subject')),
  ].filter((part) => typeof part === 'string');

/** "Add a few wishes · Got your gift yet? · Family" */
export const reminderSubject = ({ locale, group, ...parts }: ReminderParts & { locale: Locale; group: string }) => {
  const t = emailTranslator(locale);
  return [...partSubjects(t, parts), group].join(' · ');
};

/**
 * Wishlist, address, gift and ready-to-draw reminders (29, 63, 80) in one email: at most one a week per person
 * and group, so parts due in the same week come together.
 */
export const ReminderEmail = ({ locale, group, forName, unsubscribe, wishlist, address, gift, readyToDraw }: ReminderProps) => {
  const t = emailTranslator(locale);
  const subjects = partSubjects(t, { wishlist, address, gift, readyToDraw });
  const combined = subjects.length > 1;
  const sections = [
    wishlist && {
      key: 'wishlist',
      title: t('reminder.wishlist.title'),
      body: [t('reminder.wishlist.body', { group }), ...(wishlist.by ? [t('reminder.wishlist.by', { date: wishlist.by })] : [])],
      button: { href: wishlist.url, label: t('reminder.wishlist.button') },
    },
    address && {
      key: 'address',
      title: t('reminder.address.title'),
      body: [t('reminder.address.body', { group }), ...(address.postBy ? [t('reminder.address.by', { date: address.postBy })] : [])],
      button: { href: address.url, label: t('reminder.address.button') },
    },
    gift?.whiteElephant && {
      key: 'gift',
      title: t('reminder.bring.title'),
      body: [t('reminder.bring.body', { group, date: gift.giftDay })],
      button: { href: gift.url, label: t('reminder.bring.button') },
    },
    gift && !gift.whiteElephant && {
      key: 'gift',
      title: gift.postBy ? t('reminder.gift.title-post') : t('reminder.gift.title'),
      body: [
        gift.postBy ? t('reminder.gift.body-post', { group, postBy: gift.postBy, date: gift.giftDay }) : t('reminder.gift.body', { group, date: gift.giftDay }),
        t('reminder.gift.mark'),
      ],
      button: { href: gift.url, label: t('reminder.gift.button') },
    },
    readyToDraw?.lockIn && {
      key: 'ready',
      title: t('reminder.lock-in.title'),
      body: [
        readyToDraw.soon && readyToDraw.giftDay
          ? t('reminder.lock-in.body-soon', { group, date: readyToDraw.giftDay })
          : t('reminder.lock-in.body', { group, count: readyToDraw.people }),
      ],
      button: { href: readyToDraw.url, label: t('reminder.lock-in.button') },
    },
    readyToDraw && !readyToDraw.lockIn && {
      key: 'ready',
      title: t('reminder.ready.title'),
      body: [
        readyToDraw.soon && readyToDraw.giftDay
          ? t('reminder.ready.body-soon', { group, date: readyToDraw.giftDay })
          : t('reminder.ready.body', { group, count: readyToDraw.people }),
        t('reminder.ready.late'),
      ],
      button: { href: readyToDraw.url, label: t('reminder.ready.button') },
    },
  ].filter((section) => typeof section === 'object');

  return (
    <EmailLayout
      locale={locale}
      title={combined ? t('reminder.title', { group }) : sections[0].title}
      preheader={subjects.join(' · ')}
      forName={forName}
      member
      unsubscribe={unsubscribe}
    >
      {sections.map((section) => (
        <Fragment key={section.key}>
          {combined && (
            <Text>
              <strong>{section.title}</strong>
            </Text>
          )}
          {section.body.map((paragraph) => (
            <Text key={paragraph}>{paragraph}</Text>
          ))}
          <Button href={section.button.href}>{section.button.label}</Button>
        </Fragment>
      ))}
    </EmailLayout>
  );
};
