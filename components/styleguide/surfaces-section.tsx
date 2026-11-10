import { StyleguideRow, StyleguideSection } from './styleguide-section';

const borders = [
  { className: 'bordered', use: 'Boxes: 3px, 2px under 480px' },
  { className: 'border-2 border-outline', use: 'Chips, icon tiles, nav items' },
  { className: 'border-2 border-control', use: 'Form controls' },
  { className: 'border-2 border-dashed border-outline', use: 'Dividers inside cards, upcoming phases' },
];

const shadows = [
  { className: 'shadow-sm', use: 'Active segment and nav item, current phase' },
  { className: 'shadow-md', use: 'Cards and buttons' },
  { className: 'shadow-lg', use: 'Dialogs and menus' },
  { className: 'shadow-brand', use: 'The one card that matters most on a page' },
];

const spacing = [
  { className: 'w-3', name: 'gap-3', use: 'Icon to text, buttons in a row' },
  { className: 'w-4', name: 'gap-4 · p-4', use: 'Inside a section; small card padding' },
  { className: 'w-6', name: 'gap-6 · p-6', use: 'Between cards; card padding' },
  { className: 'w-8', name: 'gap-8', use: 'Page header to content' },
  { className: 'w-10', name: 'gap-10', use: 'Between page sections' },
];

const Sample = ({ className, label, use }: { className: string; label: string; use: string }) => (
  <div className={`flex flex-col gap-1 bg-surface p-3 sm:p-4 ${className}`}>
    <code className="text-sm font-bold break-words">{label}</code>
    <span className="text-sm text-muted">{use}</span>
  </div>
);

export const SurfacesSection = () => (
  <StyleguideSection
    id="borders-shadows"
    title="Borders, shadows and pressable"
    description="Square corners everywhere. Outlines and hard shadows stay dark in both themes."
  >
    <StyleguideRow label="Borders">
      <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-4">
        {borders.map(({ className, use }) => (
          <Sample key={className} className={className} label={className} use={use} />
        ))}
      </div>
    </StyleguideRow>
    <StyleguideRow label="Shadows (with bordered)">
      <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-4">
        {shadows.map(({ className, use }) => (
          <Sample key={className} className={`bordered ${className}`} label={className} use={use} />
        ))}
      </div>
    </StyleguideRow>
    <StyleguideRow label="Pressable: hover and press it">
      <button type="button" className="bg-surface p-3 text-left bordered shadow-md pressable sm:p-4">
        <code className="text-sm font-bold">shadow-md pressable</code>
        <span className="block text-sm text-muted">Clickable boxes press into their shadow</span>
      </button>
    </StyleguideRow>
  </StyleguideSection>
);

export const SpacingSection = () => (
  <StyleguideSection id="spacing" title="Spacing" description="The Tailwind 4px scale; these steps cover nearly every layout.">
    <ul className="flex flex-col gap-3">
      {spacing.map(({ className, name, use }) => (
        <li key={name} className="flex items-center gap-4">
          <span aria-hidden="true" className="w-10 shrink-0">
            <span className={`block h-6 bg-primary ${className}`} />
          </span>
          <code className="w-28 shrink-0 text-sm font-bold">{name}</code>
          <span className="text-sm text-muted">{use}</span>
        </li>
      ))}
    </ul>
  </StyleguideSection>
);
