import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { avatarColors, type AvatarColor } from '@/lib/schema/user';
import { cn } from '@/lib/utils';

export const avatarFills: Record<AvatarColor, string> = {
  'primary-muted': 'bg-primary-muted',
  yellow: 'bg-yellow',
  mint: 'bg-mint',
  coral: 'bg-coral',
};

/**
 * Initial on the person's colour, or without one on a colour picked from the member id, so a person keeps their colour
 * everywhere. Decorative: the name is next to it.
 */
export const PersonAvatar = ({ id, name, color, className }: { id: string; name: string; color?: AvatarColor; className?: string }) => {
  const fill = color ?? avatarColors[[...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % avatarColors.length];
  return (
    <Avatar aria-hidden="true" className={className}>
      <AvatarFallback className={cn(avatarFills[fill], 'text-ink')}>{name.trim().slice(0, 1).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
};
