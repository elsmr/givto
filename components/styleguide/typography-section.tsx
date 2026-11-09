import { StyleguideSection } from './styleguide-section';

export const TypographySection = () => (
  <StyleguideSection id="typography" title="Typography">
    <div className="flex flex-col gap-3">
      <p className="text-5xl font-extrabold font-heading">
        Heading 1 · Family Secret Santa
      </p>
      <p className="text-4xl font-extrabold font-heading">
        Heading 2 · The big reveal
      </p>
      <p className="text-3xl font-bold font-heading">Heading 3 · Gift day</p>
      <p className="text-2xl font-bold font-heading">Heading 4 · Your giftee</p>
      <p className="text-lg">
        Body text uses the system font stack. Add a few wishes so your Santa
        knows what to get you.
      </p>
      <p className="text-muted">Muted text for secondary information.</p>
      <p className="text-danger">Danger text for errors.</p>
      <p>
        An inline <a href="#typography">link</a> in running text.
      </p>
    </div>
  </StyleguideSection>
);
