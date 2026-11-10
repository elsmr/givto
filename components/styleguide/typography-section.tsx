import { StyleguideSection } from './styleguide-section';

const scale = [
  { className: 'font-heading text-6xl leading-none font-extrabold tabular-nums', sample: '12', use: 'Big number: the countdown on the hero card' },
  { className: 'font-heading text-4xl font-extrabold sm:text-5xl', sample: 'Family Secret Santa', use: 'Page title (PageHeader h1), 4xl on phones' },
  { className: 'font-heading text-3xl leading-none font-extrabold tabular-nums', sample: '7', use: 'Stat number (StatCard)' },
  { className: 'font-heading text-2xl font-bold', sample: 'Your groups', use: 'Section heading (h2)' },
  { className: 'font-heading text-xl font-bold', sample: 'Gift day', use: 'Card title' },
  { className: 'text-lg', sample: 'Add a few wishes so your Santa knows what to get you.', use: 'Intro text' },
  { className: 'text-base', sample: 'Body text in the system font stack.', use: 'Body' },
  { className: 'text-sm text-muted', sample: 'Gift day 24 December · 6 people', use: 'Descriptions, secondary lines' },
  { className: 'text-xs font-semibold text-muted', sample: 'days to go', use: 'Tiny label under a big number' },
];

export const TypographySection = () => (
  <StyleguideSection
    id="typography"
    title="Typography"
    description="Headings and numbers use the heading font, everything else the system font. Weight carries the hierarchy: extrabold for titles and numbers, bold for headings, semibold for labels."
  >
    <ul className="flex flex-col">
      {scale.map(({ className, sample, use }) => (
        <li
          key={className}
          className="flex flex-col gap-1 border-t-2 border-dashed border-outline py-4 first:border-t-0 first:pt-0 sm:flex-row sm:items-baseline sm:gap-6"
        >
          <span className="flex shrink-0 flex-col text-xs text-muted sm:w-48">
            <span className="font-semibold text-ink">{use}</span>
            <code>{className}</code>
          </span>
          <span className={`min-w-0 break-words ${className}`}>{sample}</span>
        </li>
      ))}
    </ul>
    <p>
      An inline <a href="#typography">link</a> in running text, and <span className="text-danger">danger text</span> for errors.
    </p>
  </StyleguideSection>
);
