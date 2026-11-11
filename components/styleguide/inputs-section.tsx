import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { StyleguideSection } from './styleguide-section';

const budgets = { '10': '€10', '20': '€20', '50': '€50' };

export const InputsSection = () => (
  <StyleguideSection
    id="inputs"
    title="Inputs and fields"
    description="Always a visible label. Help goes behind a (?) next to the label (hover, or tap on touch); only what's needed to fill the field right stays under it. Mark optional fields, not required ones. Errors go under the field, tied to the input with aria-describedby."
  >
    <FieldGroup className="max-w-md">
      <Field>
        <FieldLabel htmlFor="sg-name" hint="Everyone in the Secret Santa sees this name.">
          Your name
        </FieldLabel>
        <Input id="sg-name" autoComplete="name" placeholder="Ann" />
      </Field>
      <Field>
        <FieldLabel htmlFor="sg-names" optional>
          Names
        </FieldLabel>
        <Input id="sg-names" aria-describedby="sg-names-help" />
        <FieldDescription id="sg-names-help">One per line, or separated by commas.</FieldDescription>
      </Field>
      <Field data-invalid="true">
        <FieldLabel htmlFor="sg-email">Email</FieldLabel>
        <Input
          id="sg-email"
          type="email"
          autoComplete="email"
          defaultValue="ann@"
          aria-invalid="true"
          aria-describedby="sg-email-error"
        />
        <FieldError id="sg-email-error">Enter a full email address.</FieldError>
      </Field>
      <Field>
        <FieldLabel htmlFor="sg-disabled">Disabled</FieldLabel>
        <Input id="sg-disabled" disabled defaultValue="Can't change this" />
      </Field>
      <Field>
        <FieldLabel htmlFor="sg-wish">Wish</FieldLabel>
        <Textarea id="sg-wish" placeholder="Wool socks, size 42" />
      </Field>
      <Field>
        <FieldLabel htmlFor="sg-native">Native select</FieldLabel>
        <NativeSelect id="sg-native" defaultValue="nl">
          <NativeSelectOption value="en">English</NativeSelectOption>
          <NativeSelectOption value="nl">Nederlands</NativeSelectOption>
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel id="sg-budget-label">Budget</FieldLabel>
        <Select items={budgets} defaultValue="20">
          <SelectTrigger aria-labelledby="sg-budget-label">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(budgets).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </FieldGroup>
  </StyleguideSection>
);
