import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field';
import { SegmentedRadio } from '@/components/ui/segmented-radio';
import { Switch } from '@/components/ui/switch';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { StyleguideRow, StyleguideSection } from './styleguide-section';

const SegmentedRadioSample = () => {
  const [theme, setTheme] = useState('system');
  return (
    <FieldSet className="w-full max-w-md">
      <FieldLegend variant="label">Theme</FieldLegend>
      <SegmentedRadio
        name="sg-theme"
        value={theme}
        onValueChange={setTheme}
        options={[
          { value: 'system', label: 'System', icon: Monitor },
          { value: 'light', label: 'Light', icon: Sun },
          { value: 'dark', label: 'Dark', icon: Moon },
        ]}
      />
    </FieldSet>
  );
};

export const ChoicesSection = () => (
  <StyleguideSection
    id="choices"
    title="Checkbox, switch and segmented radio"
    description="Checkbox for choices saved with a form, switch for settings that apply at once, segmented radio to pick one of a few."
  >
    <StyleguideRow label="Checkbox">
      <Field orientation="horizontal" className="w-fit">
        <Checkbox id="sg-check" />
        <FieldLabel htmlFor="sg-check">Post anonymously</FieldLabel>
      </Field>
      <Field orientation="horizontal" className="w-fit">
        <Checkbox id="sg-checked" defaultChecked />
        <FieldLabel htmlFor="sg-checked">Checked</FieldLabel>
      </Field>
      <Field orientation="horizontal" className="w-fit">
        <Checkbox id="sg-check-disabled" disabled />
        <FieldLabel htmlFor="sg-check-disabled">Disabled</FieldLabel>
      </Field>
    </StyleguideRow>
    <StyleguideRow label="Switch">
      <Field orientation="horizontal" className="w-fit">
        <Switch id="sg-switch" />
        <FieldLabel htmlFor="sg-switch">Ask before people join</FieldLabel>
      </Field>
      <Field orientation="horizontal" className="w-fit">
        <Switch id="sg-switch-on" defaultChecked />
        <FieldLabel htmlFor="sg-switch-on">On</FieldLabel>
      </Field>
      <Field orientation="horizontal" className="w-fit">
        <Switch id="sg-switch-disabled" disabled />
        <FieldLabel htmlFor="sg-switch-disabled">Disabled</FieldLabel>
      </Field>
    </StyleguideRow>
    <StyleguideRow label="Segmented radio">
      <SegmentedRadioSample />
    </StyleguideRow>
  </StyleguideSection>
);
