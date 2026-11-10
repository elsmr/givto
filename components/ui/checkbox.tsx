import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { Check } from 'lucide-react';

import * as React from 'react';

import { cn } from '@/lib/utils';

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        // ::after widens the hit area to 44px (50: tap targets) without changing the look.
        'peer relative flex size-5 shrink-0 items-center justify-center after:absolute after:-inset-3 after:content-[\'\'] border-2 border-ink bg-surface data-disabled:cursor-not-allowed data-disabled:border-dashed data-disabled:bg-page data-checked:bg-primary data-checked:text-white data-indeterminate:bg-primary data-indeterminate:text-white aria-invalid:border-danger',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className={cn('flex items-center justify-center text-current')}
      >
        <Check className="size-4" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
