import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const fills = ['bg-primary-muted', 'bg-yellow', 'bg-mint', 'bg-coral'];

/** Initial on a colour picked from the member id, so a person keeps their colour everywhere. Decorative: the name is next to it. */
export const PersonAvatar = ({ id, name, className }: { id: string; name: string; className?: string }) => {
  const fill = fills[[...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % fills.length];
  return (
    <Avatar aria-hidden="true" className={className}>
      <AvatarFallback className={cn(fill, 'text-ink')}>{name.trim().slice(0, 1).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
};
