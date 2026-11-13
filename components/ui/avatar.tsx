'use client';

import { Avatar as AvatarPrimitive } from '@base-ui/react/avatar';

import * as React from 'react';

import { cn } from '@/lib/utils';

const avatarSizes = {
  sm: 'size-8',
  default: 'size-10',
  lg: 'size-12',
};

function Avatar({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: 'default' | 'sm' | 'lg';
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        'group/avatar relative flex shrink-0 overflow-hidden border-2 border-outline',
        avatarSizes[size],
        className,
      )}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'flex size-full items-center justify-center bg-yellow text-sm font-bold text-ink group-data-[size=sm]/avatar:text-xs group-data-[size=lg]/avatar:text-lg',
        className,
      )}
      {...props}
    />
  );
}

function AvatarGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="avatar-group"
      className={cn('group/avatar-group flex -space-x-1', className)}
      {...props}
    />
  );
}

function AvatarGroupCount({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        'relative flex size-10 shrink-0 items-center justify-center border-2 border-outline bg-surface text-sm font-bold text-ink [&>svg]:size-4',
        className,
      )}
      {...props}
    />
  );
}

export {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
};
