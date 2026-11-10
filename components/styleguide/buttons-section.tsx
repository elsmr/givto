import { Button } from '@/components/ui/button';
import { Gift, Plus } from 'lucide-react';
import { StyleguideRow, StyleguideSection } from './styleguide-section';

const variants = ['default', 'neutral', 'danger', 'ghost'] as const;

export const ButtonsSection = () => (
  <StyleguideSection
    id="buttons"
    title="Buttons"
    description="One default (primary) button per view for the main action; neutral for the rest; danger for what can't be undone; ghost for quiet actions in toolbars. Small buttons stay 44px tall on phones."
  >
    {variants.map((variant) => (
      <StyleguideRow key={variant} label={variant}>
        <Button variant={variant}>Draw names</Button>
        <Button variant={variant} size="sm">
          Small
        </Button>
        <Button variant={variant} size="lg">
          <Gift aria-hidden="true" /> Large
        </Button>
        <Button variant={variant} size="icon" aria-label="Add a wish">
          <Plus aria-hidden="true" />
        </Button>
        <Button variant={variant} disabled>
          Disabled
        </Button>
      </StyleguideRow>
    ))}
    <StyleguideRow label="As a link">
      <Button nativeButton={false} render={<a href="#buttons" />}>
        Link styled as a button
      </Button>
    </StyleguideRow>
  </StyleguideSection>
);
