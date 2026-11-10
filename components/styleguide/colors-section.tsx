import { StyleguideSection } from './styleguide-section';

// Light-theme hex, text colour on each fill and its WCAG contrast (.scratch/07 Findings; dark: .scratch/53).
const swatches = [
  {
    name: 'ink',
    className: 'bg-ink text-page',
    hex: '#111111',
    text: 'page 17.9:1, text',
  },
  {
    name: 'outline',
    className: 'bg-outline text-white',
    hex: '#111111',
    text: 'white 18.9:1, borders and shadows',
  },
  {
    name: 'control',
    className: 'bg-control text-page',
    hex: '#111111',
    text: 'page 17.9:1, form control borders',
  },
  {
    name: 'page',
    className: 'bg-page text-ink',
    hex: '#FFF8EC',
    text: 'ink 17.9:1',
  },
  {
    name: 'surface',
    className: 'bg-surface text-ink',
    hex: '#FFFFFF',
    text: 'ink 18.9:1',
  },
  {
    name: 'primary',
    className: 'bg-primary text-white',
    hex: '#5A51FF',
    text: 'white 5.2:1',
  },
  {
    name: 'primary-muted',
    className: 'bg-primary-muted text-ink',
    hex: '#BDB9FF',
    text: 'ink 10.4:1',
  },
  {
    name: 'coral',
    className: 'bg-coral text-ink',
    hex: '#FE7362',
    text: 'ink 7.1:1, fill only',
  },
  {
    name: 'yellow',
    className: 'bg-yellow text-ink',
    hex: '#FFD23F',
    text: 'ink 13.1:1',
  },
  {
    name: 'mint',
    className: 'bg-mint text-ink',
    hex: '#4ADE80',
    text: 'ink 10.8:1',
  },
  {
    name: 'muted',
    className: 'bg-surface text-muted',
    hex: '#5C5C66',
    text: 'text: 6.3:1 on page',
  },
  {
    name: 'danger',
    className: 'bg-surface text-danger',
    hex: '#C2261A',
    text: 'text: 5.5:1 on page',
  },
];

export const ColorsSection = () => (
  <StyleguideSection id="colors" title="Colours">
    <ul className="grid grid-cols-1 gap-4 xs:grid-cols-2 md:grid-cols-3">
      {swatches.map((swatch) => (
        <li
          key={swatch.name}
          className={`flex flex-col gap-1 p-4 bordered shadow-md ${swatch.className}`}
        >
          <span className="font-bold">{swatch.name}</span>
          <span className="text-sm">
            {swatch.hex} · {swatch.text}
          </span>
        </li>
      ))}
    </ul>
    <div className="flex flex-wrap gap-6">
      {['shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-brand'].map((shadow) => (
        <div key={shadow} className={`bg-surface p-4 bordered ${shadow}`}>
          {shadow}
        </div>
      ))}
    </div>
  </StyleguideSection>
);
