import { cva, type VariantProps } from 'class-variance-authority';
import { CircleHelp } from 'lucide-react';
import { useTranslations } from 'next-intl';

import * as React from 'react';

import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { cn } from '@/lib/utils';

function FieldSet({ className, ...props }: React.ComponentProps<'fieldset'>) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        'flex flex-col gap-4 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3',
        className,
      )}
      {...props}
    />
  );
}

type FieldLabelExtras = {
  /** Help behind a (?) next to the label: opens on hover, and on tap for touch. */
  hint?: React.ReactNode;
  optional?: boolean;
};

function FieldOptional() {
  const t = useTranslations('ui.field');
  return <span className="font-normal text-muted">{t('optional')}</span>;
}

// A popover, not a tooltip: Base UI disables tooltips on touch devices.
function FieldHint({ children, label }: { children: React.ReactNode; label?: string }) {
  const t = useTranslations('ui.field');
  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        aria-label={label ?? t('more-info')}
        className="-mx-2 -my-3.5 inline-flex size-11 shrink-0 cursor-help items-center justify-center text-muted hover:text-ink data-popup-open:text-ink"
      >
        <CircleHelp className="size-4" aria-hidden />
      </PopoverTrigger>
      <PopoverContent side="top" className="w-auto max-w-72 gap-0 p-3 text-sm font-normal">
        {children}
      </PopoverContent>
    </Popover>
  );
}

function FieldLegend({
  className,
  variant = 'legend',
  hint,
  optional,
  children,
  ...props
}: React.ComponentProps<'legend'> & { variant?: 'legend' | 'label' } & FieldLabelExtras) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        'mb-1.5 font-bold data-[variant=label]:text-sm data-[variant=legend]:text-base',
        (hint || optional) && 'flex items-center gap-2',
        className,
      )}
      {...props}
    >
      {children}
      {optional && <FieldOptional />}
      {hint && <FieldHint>{hint}</FieldHint>}
    </legend>
  );
}

function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        'group/field-group @container/field-group flex w-full flex-col gap-5 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4',
        className,
      )}
      {...props}
    />
  );
}

const fieldVariants = cva(
  'group/field flex w-full gap-2 data-[invalid=true]:text-danger',
  {
    variants: {
      orientation: {
        vertical: 'flex-col *:w-full [&>.sr-only]:w-auto',
        horizontal:
          'flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
        responsive:
          'flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px',
      },
    },
    defaultVariants: {
      orientation: 'vertical',
    },
  },
);

function Field({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof fieldVariants>) {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orientation}
      className={cn(fieldVariants({ orientation }), className)}
      {...props}
    />
  );
}

// The (?) sits next to the label, not in it: a button inside a <label> is invalid HTML.
function FieldLabel({
  className,
  hint,
  optional,
  children,
  ...props
}: React.ComponentProps<typeof Label> & FieldLabelExtras) {
  const label = (
    <Label
      data-slot="field-label"
      className={cn(
        'group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:border-2 has-[>[data-slot=field]]:border-outline has-[>[data-slot=field]]:bg-surface has-[>[data-slot=field]]:has-data-checked:bg-primary-muted *:data-[slot=field]:p-2.5',
        'has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col',
        className,
      )}
      {...props}
    >
      {children}
      {optional && <FieldOptional />}
    </Label>
  );
  return hint ? (
    <div className="flex items-center">
      {label}
      <FieldHint>{hint}</FieldHint>
    </div>
  ) : (
    label
  );
}

function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        'text-left text-sm leading-normal text-muted group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-1.5',
        'last:mt-0 nth-last-2:-mt-1',
        '[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-ink',
        className,
      )}
      {...props}
    />
  );
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<'div'> & {
  children?: React.ReactNode;
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(
        'relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2',
        className,
      )}
      {...props}
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        className="absolute inset-x-0 top-1/2 border-t-2 border-outline"
      />
      {children && (
        <span
          className="relative mx-auto block w-fit bg-page px-2 text-muted"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  );
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<'div'> & {
  errors?: Array<{ message?: string } | undefined>;
}) {
  const content = React.useMemo(() => {
    if (children) {
      return children;
    }

    if (!errors?.length) {
      return null;
    }

    const uniqueErrors = Array.from(
      new Map(errors.map((error) => [error?.message, error])).values(),
    );

    if (uniqueErrors?.length == 1) {
      return uniqueErrors[0]?.message;
    }

    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {uniqueErrors.map(
          (error, index) =>
            error?.message && <li key={index}>{error.message}</li>,
        )}
      </ul>
    );
  }, [children, errors]);

  if (!content) {
    return null;
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn('text-sm text-danger', className)}
      {...props}
    >
      {content}
    </div>
  );
}

export {
  Field,
  FieldHint,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
};
