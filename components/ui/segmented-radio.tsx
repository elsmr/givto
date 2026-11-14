import { tabsListVariants } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface SegmentedRadioProps<T extends string> {
  name: string;
  value: T;
  onValueChange: (value: T) => void;
  options: readonly { value: T; label: string; icon?: LucideIcon }[];
  /** Names the highlight and labels for a view transition, so the highlight slides across. */
  transitionName?: string;
  className?: string;
}

/** Native radios (one choice, arrow keys) drawn as the segmented control. Put it in a FieldSet with a FieldLegend. */
export const SegmentedRadio = <T extends string>({
  name,
  value,
  onValueChange,
  options,
  transitionName,
  className,
}: SegmentedRadioProps<T>) => (
  <div className={cn(tabsListVariants({ variant: 'segmented' }), 'flex w-full items-stretch', className)}>
    {options.map(({ value: option, label, icon: Icon }) => (
      <label
        key={option}
        className="relative flex min-h-11 flex-1 basis-0 cursor-pointer flex-col items-center justify-center gap-0.5 border-2 border-transparent px-1 py-1.5 text-center text-xs leading-tight font-bold not-has-checked:hover:bg-surface has-checked:-translate-x-0.5 has-checked:-translate-y-0.5 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-solid sm:flex-row sm:gap-2 sm:text-sm"
      >
        <input
          type="radio"
          name={name}
          value={option}
          checked={value === option}
          onChange={() => onValueChange(option)}
          className="sr-only"
        />
        {value === option && (
          <span
            aria-hidden="true"
            className="absolute -inset-0.5 border-2 border-outline bg-surface shadow-sm"
            style={transitionName ? { viewTransitionName: `${transitionName}-choice` } : undefined}
          />
        )}
        {/* Its own layer, painted after the highlight's, so the label stays on top while it slides. */}
        <span
          className="relative flex flex-col items-center gap-0.5 sm:flex-row sm:gap-2"
          style={transitionName ? { viewTransitionName: `${transitionName}-${option}` } : undefined}
        >
          {Icon && <Icon aria-hidden="true" className="size-5 shrink-0" />}
          {label}
        </span>
      </label>
    ))}
  </div>
);
