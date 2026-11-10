import { AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar';
import { useLayoutEffect, useRef, useState } from 'react';
import type { GroupMember } from './group-data';
import { PersonAvatar } from './person-avatar';

const MAX_SHOWN = 8;
// Avatars and the count are 40px squares (size-10) overlapping by 8px (-space-x-2).
const STEP = 32;
const OVERLAP = 8;

/**
 * Overlapping avatar squares, as many as fit its width (at most 8), "+n" for the rest. Takes the free
 * width of its row. Decorative: callers say how many people that is.
 */
export const AvatarStack = ({ people }: { people: Pick<GroupMember, 'id' | 'name'>[] }) => {
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

  return (
    <AvatarGroup ref={ref} aria-hidden="true" className="min-w-0 flex-1 justify-end -space-x-2">
      {people.slice(0, shown).map((person) => (
        <PersonAvatar key={person.id} id={person.id} name={person.name} />
      ))}
      {people.length > shown && <AvatarGroupCount>+{people.length - shown}</AvatarGroupCount>}
    </AvatarGroup>
  );
};
