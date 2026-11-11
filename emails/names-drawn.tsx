/** @jsxImportSource react */
import { Button } from './ui/button';
import { EmailLayout } from './ui/layout';
import type { NoticeProps } from './ui/props';
import { Text } from './ui/text';
import { emailTranslator } from './ui/translator';

/** `addAddress`: gifts go by post and this Santa hasn't added their own address yet (80). */
type NamesDrawnProps = NoticeProps & { giftDay?: string; budget?: string; addAddress?: boolean };

export const namesDrawnSubject = ({ locale, group }: Pick<NoticeProps, 'locale' | 'group'>) =>
  emailTranslator(locale)('names-drawn.subject', { group });

/** After the draw. Never names the giftee: the button reveals them in the app (PLAN-v2). */
export const NamesDrawnEmail = ({ locale, group, url, forName, giftDay, budget, addAddress }: NamesDrawnProps) => {
  const t = emailTranslator(locale);
  return (
    <EmailLayout locale={locale} title={t('names-drawn.title')} preheader={t('names-drawn.preheader')} forName={forName} member>
      <Text>{t('names-drawn.body', { group })}</Text>
      {(giftDay || budget) && (
        <Text>
          {giftDay && t('names-drawn.gift-day', { date: giftDay })}
          {giftDay && budget && <br />}
          {budget && t('names-drawn.budget', { budget })}
        </Text>
      )}
      {addAddress && <Text>{t('names-drawn.address')}</Text>}
      <Button href={url}>{t('names-drawn.button')}</Button>
    </EmailLayout>
  );
};
