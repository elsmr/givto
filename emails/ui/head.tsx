/** @jsxImportSource react */
import { color } from './tokens';

const dark = {
  page: '#16151B',
  surface: '#232229',
  text: '#F4F1EA',
  muted: '#B9B7C2',
};

// Inline styles carry the design; this block only adds what can't be inline: Outlook's
// heading font fallback, dark mode (Apple Mail, Outlook.com's data-ogsc/ogsb) and mobile padding.
// Clients that strip it (some Gmail) keep the light version, which is fine.
const css = `
:root { color-scheme: light dark; supported-color-schemes: light dark; }
body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; }
h1 { mso-font-alt: 'Arial Black'; }
@media (prefers-color-scheme: dark) {
  .bg-page { background-color: ${dark.page} !important; }
  .bg-surface { background-color: ${dark.surface} !important; }
  .text { color: ${dark.text} !important; }
  .text-muted { color: ${dark.muted} !important; }
  .ink-border { border-color: ${color.page} !important; }
  .shadow-ink { background-color: ${color.page} !important; }
}
[data-ogsb] .bg-page { background-color: ${dark.page} !important; }
[data-ogsb] .bg-surface { background-color: ${dark.surface} !important; }
[data-ogsc] .text { color: ${dark.text} !important; }
[data-ogsc] .text-muted { color: ${dark.muted} !important; }
[data-ogsc] .ink-border { border-color: ${color.page} !important; }
[data-ogsb] .shadow-ink { background-color: ${color.page} !important; }
@media (max-width: 640px) {
  .container { width: 100% !important; }
  .card-body { padding: 20px !important; }
}
`;

export const EmailHead = ({ title }: { title: string }) => (
  <head>
    <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta name="color-scheme" content="light dark" />
    <meta name="supported-color-schemes" content="light dark" />
    <title>{title}</title>
    <style dangerouslySetInnerHTML={{ __html: css }} />
  </head>
);
