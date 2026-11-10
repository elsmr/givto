/** @jsxImportSource react */
import { Button } from './ui/button';
import { ItemList } from './ui/item-list';
import { EmailLayout } from './ui/layout';
import type { NoticeProps } from './ui/props';
import { Text } from './ui/text';
import { emailTranslator } from './ui/translator';

type WishlistUpdatedProps = NoticeProps & { added: string[]; updated: string[] };

export const wishlistUpdatedSubject = ({ locale }: Pick<NoticeProps, 'locale'>) =>
  emailTranslator(locale)('wishlist-updated.subject');

/** Debounced digest for the Santa (35): new and changed wishes since the last one, visible ones only. */
export const WishlistUpdatedEmail = ({ locale, group, url, forName, unsubscribe, added, updated }: WishlistUpdatedProps) => {
  const t = emailTranslator(locale);
  const count = added.length + updated.length;
  return (
    <EmailLayout
      locale={locale}
      title={t('wishlist-updated.title')}
      preheader={t('wishlist-updated.preheader', { count, group })}
      forName={forName}
      member
      unsubscribe={unsubscribe}
    >
      <Text>{t('wishlist-updated.intro', { group })}</Text>
      {added.length > 0 && (
        <>
          <Text>
            <strong>{t('wishlist-updated.added', { count: added.length })}</strong>
          </Text>
          <ItemList items={added} />
        </>
      )}
      {updated.length > 0 && (
        <>
          <Text>
            <strong>{t('wishlist-updated.updated', { count: updated.length })}</strong>
          </Text>
          <ItemList items={updated} />
        </>
      )}
      <Button href={url}>{t('wishlist-updated.button')}</Button>
    </EmailLayout>
  );
};
