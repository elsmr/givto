/** @jsxImportSource react */
import type { Locale } from '../../lib/schema/common';
import type { UnsubscribeCategory } from './categories';
import { siteUrl } from './site';
import { color, font } from './tokens';
import { emailTranslator } from './translator';

export interface FooterProps {
  locale: Locale;
  /** Notification emails about a group the recipient is in say why they get them. */
  member?: boolean;
  unsubscribe?: { url: string; category: UnsubscribeCategory };
}

const link = { color: color.textMuted, textDecoration: 'underline' };

const footerStyle = { margin: 0, padding: '20px 4px 0', fontFamily: font.body, fontSize: 13, lineHeight: '20px', color: color.textMuted };

export const Footer = ({ locale, member = false, unsubscribe }: FooterProps) => {
  // Account emails (sign-in, invite, join reminder, delete account) only name the sender.
  if (!member && !unsubscribe) {
    const home = siteUrl(locale, '');
    return (
      <p className="text-muted" style={footerStyle}>
        {'Givto · '}
        <a href={home} className="text-muted" style={link}>
          {new URL(home).host}
        </a>
      </p>
    );
  }
  const t = emailTranslator(locale);
  return (
    <p className="text-muted" style={footerStyle}>
      {member && t('layout.why')}
      {member && unsubscribe && <br />}
      {unsubscribe && (
        <>
          <a href={siteUrl(locale, '/account')} className="text-muted" style={link}>
            {t('layout.manage')}
          </a>
          {' · '}
          <a href={unsubscribe.url} className="text-muted" style={link}>
            {t('layout.unsubscribe', { category: t(`layout.category.${unsubscribe.category}`) })}
          </a>
        </>
      )}
    </p>
  );
};
