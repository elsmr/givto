import { AvatarGroup, AvatarGroupCount } from '@/components/ui/avatar';
import type { GroupMember } from './group-data';
import { PersonAvatar } from './person-avatar';

const shown = 5;

/** Overlapping avatar squares, "+n" for the rest. Decorative: callers say how many people that is. */
export const AvatarStack = ({ people }: { people: Pick<GroupMember, 'id' | 'name'>[] }) => (
  <AvatarGroup aria-hidden="true" className="-space-x-2">
    {people.slice(0, shown).map((person) => (
      <PersonAvatar key={person.id} id={person.id} name={person.name} />
    ))}
    {people.length > shown && <AvatarGroupCount>+{people.length - shown}</AvatarGroupCount>}
  </AvatarGroup>
);
