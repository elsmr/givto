import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { cva, type VariantProps } from 'class-variance-authority';

import * as React from 'react';

import { cn } from '@/lib/utils';

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn(
        'w-full data-[orientation=vertical]:flex data-[orientation=vertical]:items-start data-[orientation=vertical]:gap-2',
        className,
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  'group/tabs-list inline-flex items-center justify-center text-ink data-[orientation=vertical]:h-fit data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch',
  {
    variants: {
      variant: {
        default: 'h-13 bordered bg-surface p-1',
        // The active segment is raised out of a sunken track.
        segmented: 'bordered bg-page p-1 gap-1',
        line: 'gap-1 border-b-2 border-outline bg-transparent data-[orientation=vertical]:border-r-2 data-[orientation=vertical]:border-b-0',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

// The active look lives on this indicator rather than the tab, so it can slide between tabs.
const tabsIndicatorVariants = cva(
  'absolute transition-[left,top,width,height] duration-200 ease-out motion-reduce:transition-none',
  {
    variants: {
      variant: {
        default: 'top-(--active-tab-top) left-(--active-tab-left) h-(--active-tab-height) w-(--active-tab-width) border-2 border-outline bg-primary',
        segmented: 'top-(--active-tab-top) left-(--active-tab-left) h-(--active-tab-height) w-(--active-tab-width) -translate-x-0.5 -translate-y-0.5 border-2 border-outline bg-yellow shadow-sm',
        line: 'bg-primary data-[orientation=horizontal]:-bottom-0.5 data-[orientation=horizontal]:left-(--active-tab-left) data-[orientation=horizontal]:h-1 data-[orientation=horizontal]:w-(--active-tab-width) data-[orientation=vertical]:top-(--active-tab-top) data-[orientation=vertical]:-right-0.5 data-[orientation=vertical]:h-(--active-tab-height) data-[orientation=vertical]:w-1',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function TabsList({
  className,
  variant = 'default',
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), 'relative', className)}
      {...props}
    >
      {children}
      <TabsPrimitive.Indicator renderBeforeHydration className={tabsIndicatorVariants({ variant })} />
    </TabsPrimitive.List>
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Tab>) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative z-1 inline-flex items-center justify-center whitespace-nowrap h-full border-2 border-transparent px-3 gap-1.5 text-sm font-bold disabled:pointer-events-none disabled:opacity-50 data-disabled:pointer-events-none data-disabled:opacity-50 data-active:text-white data-[orientation=vertical]:w-full data-[orientation=vertical]:justify-start [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        'group-data-[variant=segmented]/tabs-list:not-data-active:hover:bg-surface group-data-[variant=segmented]/tabs-list:data-active:text-outline',
        'group-data-[variant=line]/tabs-list:data-active:text-ink',
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Panel>) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn(
        'mt-2 data-[orientation=vertical]:mt-0 data-[orientation=vertical]:flex-1 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200',
        className,
      )}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants, tabsIndicatorVariants };
