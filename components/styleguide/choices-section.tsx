import { Checkbox } from '@/components/ui/checkbox';
import { Field, FieldLabel } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';
import { StyleguideRow, StyleguideSection } from './styleguide-section';

export const ChoicesSection = () => (
  <StyleguideSection
    id="choices"
    title="Checkbox and switch"
    description="Checkbox for choices saved with a form, switch for settings that apply at once."
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
  </StyleguideSection>
);
