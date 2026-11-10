/** @jsxImportSource react */
import type { ReactNode } from 'react';
import type { Locale } from '../../lib/schema/common';
import { bgcolor, presentation } from './attrs';
import { Footer, type FooterProps } from './footer';
import { HardShadow } from './hard-shadow';
import { EmailHead } from './head';
import { Heading } from './heading';
import { assetUrl } from './site';
import { color, font } from './tokens';
import { emailTranslator } from './translator';

interface EmailLayoutProps extends FooterProps {
  locale: Locale;
  title: string;
  /** The inbox preview line after the subject. */
  preheader: string;
  /** The managed member (kid) this email is about, shown to their manager. */
  forName?: string;
  children: ReactNode;
}

// Pads the preheader so clients don't fill the preview with the body text.
const PREHEADER_PADDING = '\u00a0\u200c'.repeat(60);

/** One column, max 600px, cream page, white card with a hard shadow; everything inline. */
export const EmailLayout = ({ locale, title, preheader, forName, children, ...footer }: EmailLayoutProps) => {
  const t = emailTranslator(locale);
  return (
    <html lang={locale} dir="ltr">
      <EmailHead title={title} />
      <body className="bg-page" style={{ margin: 0, padding: 0, backgroundColor: color.page }}>
        <div data-skip-in-text="true" style={{ display: 'none', maxHeight: 0, overflow: 'hidden', fontSize: 1, lineHeight: '1px', color: color.page }}>
          {preheader}
          {PREHEADER_PADDING}
        </div>
        <table {...presentation} width="100%" {...bgcolor(color.page)} className="bg-page" style={{ backgroundColor: color.page }}>
          <tbody>
            <tr>
              <td align="center" style={{ padding: '24px 12px 40px' }}>
                <table {...presentation} width={600} className="container" style={{ width: 600, maxWidth: 600 }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '0 0 20px' }}>
                        <img src={assetUrl('/givto-logo.png')} width={48} height={48} alt={t('layout.logo-alt')} style={{ display: 'block', border: 0, width: 48, height: 48 }} />
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <HardShadow fill={color.surface} fillClass="bg-surface card-body" boxStyle={{ padding: 32 }}>
                          {forName && (
                            <p className="text-muted" style={{ margin: '0 0 8px', fontFamily: font.body, fontSize: 14, fontWeight: 700, color: color.textMuted }}>
                              {t('layout.for', { name: forName })}
                            </p>
                          )}
                          <Heading>{title}</Heading>
                          {children}
                        </HardShadow>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <Footer locale={locale} {...footer} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
};
