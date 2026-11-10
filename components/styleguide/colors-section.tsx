import { StyleguideSection } from './styleguide-section';

type Swatch = {
  token: string;
  /** The fill and the text colour that goes on it. */
  className: string;
  light: string;
  dark: string;
  /** WCAG contrast light / dark: the fill's text on it, or a text colour on page (.scratch/07 and 53 Findings). */
  contrast: [number, number];
  use: string;
};
type Fill = Swatch & { text: string };

const fills: Fill[] = [
  { token: 'page', className: 'bg-page text-ink', text: 'ink', light: '#FFF8EC', dark: '#2B1C3B', contrast: [17.9, 14.9], use: 'Page background' },
  { token: 'surface', className: 'bg-surface text-ink', text: 'ink', light: '#FFFFFF', dark: '#3C2D51', contrast: [18.9, 11.8], use: 'Cards, inputs, menus, nav' },
  { token: 'primary', className: 'bg-primary text-white', text: 'white', light: '#5A51FF', dark: '#5A51FF', contrast: [5.2, 5.2], use: 'Main action, brand shadow' },
  { token: 'primary-muted', className: 'bg-primary-muted text-ink', text: 'ink', light: '#BDB9FF', dark: '#49379F', contrast: [10.4, 8.5], use: 'Chips, tiles, ghost hover' },
  { token: 'yellow', className: 'bg-yellow text-ink', text: 'ink', light: '#FFD23F', dark: '#FFD23F', contrast: [13.1, 13.1], use: 'Chips, tiles, active nav, current phase' },
  { token: 'mint', className: 'bg-mint text-ink', text: 'ink', light: '#4ADE80', dark: '#4ADE80', contrast: [10.8, 10.8], use: 'Done, ready, received' },
  { token: 'coral', className: 'bg-coral text-ink', text: 'ink', light: '#FE7362', dark: '#FE7362', contrast: [7.1, 7.1], use: 'Danger button, gift day. Fill only, never text' },
  { token: 'ink', className: 'bg-ink text-page', text: 'page', light: '#111111', dark: '#FFF8EC', contrast: [17.9, 14.9], use: 'Text; tooltips and counters as a fill' },
  { token: 'outline', className: 'bg-outline text-white', text: 'white', light: '#111111', dark: '#111111', contrast: [18.9, 18.9], use: 'Borders and hard shadows, dark in both themes' },
  { token: 'control', className: 'bg-control text-page', text: 'page', light: '#111111', dark: '#988AB2', contrast: [17.9, 5.0], use: 'Form control borders, 3:1 on page and surface' },
];

const texts: Swatch[] = [
  { token: 'muted', className: 'text-muted', light: '#5C5C66', dark: '#C7BFD8', contrast: [6.3, 8.9], use: 'Secondary text, descriptions, labels under numbers' },
  { token: 'danger', className: 'text-danger', light: '#C2261A', dark: '#FF9A8A', contrast: [5.5, 7.7], use: 'Errors and invalid borders' },
  { token: 'link', className: 'text-link', light: '#5A51FF', dark: '#BDB9FF', contrast: [4.9, 8.7], use: 'Links in running text' },
  { token: 'focus', className: 'text-focus', light: '#5A51FF', dark: '#BDB9FF', contrast: [4.9, 8.7], use: 'The :focus-visible ring' },
];

const Values = ({ swatch, on }: { swatch: Swatch; on: string }) => (
  <>
    <span className="text-sm">{swatch.use}</span>
    <span className="text-xs">
      {swatch.light} · dark {swatch.dark}
    </span>
    <span className="text-xs font-semibold">
      {on} {swatch.contrast[0].toFixed(1)}:1 · dark {swatch.contrast[1].toFixed(1)}:1
    </span>
  </>
);

export const ColorsSection = () => (
  <StyleguideSection
    id="colours"
    title="Colours"
    description="Tokens from styles/globals.css; dark values switch with the theme. Each fill shows the text colour that goes on it. No other colours."
  >
    <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {fills.map((swatch) => (
        <li key={swatch.token} className={`flex flex-col gap-1 p-3 bordered shadow-sm sm:p-4 ${swatch.className}`}>
          <span className="font-bold break-words">bg-{swatch.token}</span>
          <Values swatch={swatch} on={`text-${swatch.text}`} />
        </li>
      ))}
    </ul>
    <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
      {texts.map((swatch) => (
        <li key={swatch.token} className="flex flex-col gap-1 bg-page p-3 bordered shadow-sm sm:p-4">
          <span className={`font-bold break-words ${swatch.className}`}>text-{swatch.token}</span>
          <Values swatch={swatch} on="on page" />
        </li>
      ))}
    </ul>
  </StyleguideSection>
);
