import { Menu as MenuPrimitive } from '@base-ui/react/menu';

import * as React from 'react';

import { cn } from '@/lib/utils';

// Base UI's GroupLabel must live inside a Group or RadioGroup. Track that so a
// standalone label (like Radix allowed) still renders instead of throwing.
const DropdownMenuGroupContext = React.createContext(false);

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Root>) {
  return <MenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Trigger>) {
  return <MenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Group>) {
  return (
    <DropdownMenuGroupContext.Provider value={true}>
      <MenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
    </DropdownMenuGroupContext.Provider>
  );
}

const dropdownMenuPopupClassName =
  'z-50 min-w-[8rem] overflow-hidden border-2 border-outline bg-surface p-1 shadow-md text-ink outline-none origin-(--transform-origin) data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2';

function DropdownMenuContent({
  className,
  align = 'center',
  alignOffset = 0,
  side = 'bottom',
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Popup> &
  Pick<
    React.ComponentProps<typeof MenuPrimitive.Positioner>,
    'align' | 'alignOffset' | 'side' | 'sideOffset'
  >) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        className="isolate z-50 outline-none"
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(dropdownMenuPopupClassName, className)}
          {...props}
        />
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

const dropdownMenuItemClassName =
  'relative gap-2 [&_svg]:pointer-events-none [&_svg]:w-4 [&_svg]:h-4 [&_svg]:shrink-0 flex cursor-default select-none items-center border-2 border-transparent data-inset:pl-8 min-h-11 px-2 py-1.5 text-base outline-hidden transition-colors hover:bg-primary hover:text-white hover:border-outline focus:bg-primary focus:text-white focus:border-outline data-highlighted:bg-primary data-highlighted:text-white data-highlighted:border-outline data-disabled:pointer-events-none data-disabled:opacity-50';

function DropdownMenuItem({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Item> & {
  inset?: boolean;
}) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-inset={inset}
      className={cn(dropdownMenuItemClassName, className)}
      {...props}
    />
  );
}

function DropdownMenuLinkItem({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.LinkItem>) {
  return (
    <MenuPrimitive.LinkItem
      data-slot="dropdown-menu-link-item"
      className={cn(
        dropdownMenuItemClassName,
        'text-ink no-underline',
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.GroupLabel> & {
  inset?: boolean;
}) {
  const inGroup = React.useContext(DropdownMenuGroupContext);
  const labelClassName = cn(
    'px-2 py-1.5 text-sm font-bold text-muted data-inset:pl-8',
    className,
  );

  // Outside a group, Base UI's GroupLabel has no context and throws, so fall
  // back to a plain element (which is what Radix rendered anyway).
  if (!inGroup) {
    return (
      <div
        data-slot="dropdown-menu-label"
        data-inset={inset}
        className={labelClassName}
        {...(props as React.ComponentProps<'div'>)}
      />
    );
  }

  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      data-inset={inset}
      className={labelClassName}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof MenuPrimitive.Separator>) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn('-mx-1 my-1 h-0.5 bg-outline', className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLinkItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
};
