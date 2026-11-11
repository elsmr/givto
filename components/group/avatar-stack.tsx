import { AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useFormatter } from 'next-intl';
import { useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import type { GroupMember } from './group-data';
import { PersonAvatar } from './person-avatar';

const MAX_SHOWN = 8;
// Avatars and the count are 40px squares (size-10) overlapping by 8px (-space-x-2).
const STEP = 32;
const OVERLAP = 8;

/** Hover-only (mouse): the stack's label already names everyone for screen readers. */
const withName = (key: string, name: ReactNode, square: ReactElement) => (
  <Tooltip key={key}>
    <TooltipTrigger render={<span className="flex" />}>{square}</TooltipTrigger>
    <TooltipContent>{name}</TooltipContent>
  </Tooltip>
);

/**
 * Overlapping avatar squares, as many as fit its width (at most 8), "+n" for the rest; hovering shows
 * the names. Takes the free width of its row. `label` is what screen readers get, e.g. who's in.
 */
export const AvatarStack = ({ people, label }: { people: (Pick<GroupMember, 'id' | 'name'> & Partial<Pick<GroupMember, 'avatarColor'>>)[]; label: string }) => {
  const format = useFormatter();
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  const squares = Math.max(2, Math.floor((width - OVERLAP) / STEP));
  const shown = people.length <= Math.min(squares, MAX_SHOWN) ? people.length : Math.min(squares - 1, MAX_SHOWN);
  const rest = people.slice(shown);

  return (
    <AvatarGroup ref={ref} role="img" aria-label={label} className="min-w-0 flex-1 -space-x-2">
      {people.slice(0, shown).map((person) => withName(person.id, person.name, <PersonAvatar id={person.id} name={person.name} color={person.avatarColor} />))}
      {rest.length > 0 &&
        withName('rest', format.list(rest.map((person) => person.name)), <AvatarGroupCount>+{rest.length}</AvatarGroupCount>)}
    </AvatarGroup>
  );
};
