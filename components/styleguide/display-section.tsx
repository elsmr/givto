import { statusTone } from '@/components/group/edition-phase';
import { AvatarStack } from '@/components/group/avatar-stack';
import { PersonAvatar } from '@/components/group/person-avatar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { editionStatuses } from '@/lib/schema/edition';
import { Gift } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Captioned, StyleguideRow, StyleguideSection } from './styleguide-section';

const badgeVariants = [
  'default',
  'yellow',
  'mint',
  'coral',
  'primary-muted',
] as const;

export const BadgesSection = () => {
  const t = useTranslations('dashboard.status');

  return (
    <StyleguideSection
      id="badges"
      title="Badges and chips"
      description="Short status or tag next to a title. The tones are the same as the icon tiles. An edition status always uses its tone from statusTone."
    >
      <StyleguideRow label="Tones">
        {badgeVariants.map((variant) => (
          <Badge key={variant} variant={variant}>
            {variant}
          </Badge>
        ))}
        <Badge variant="mint">
          <Gift aria-hidden="true" />
          With an icon
        </Badge>
      </StyleguideRow>
      <StyleguideRow label="Edition status (statusTone)">
        {editionStatuses.map((status) => (
          <Captioned key={status} caption={`${status} → ${statusTone[status]}`}>
            <Badge variant={statusTone[status]}>{t(status)}</Badge>
          </Captioned>
        ))}
      </StyleguideRow>
    </StyleguideSection>
  );
};

const people = ['Ann', 'Bob', 'Cat', 'Dan', 'Eve', 'Finn', 'Gus'].map((name) => ({ id: name.toLowerCase(), name }));

export const AvatarsSection = () => (
  <StyleguideSection
    id="avatars"
    title="Avatars"
    description="PersonAvatar picks a fill from the member id, so a person keeps their colour everywhere. Decorative: the name or count is always next to it."
  >
    <StyleguideRow label="Sizes">
      <Avatar size="sm">
        <AvatarFallback>A</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>A</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback>A</AvatarFallback>
      </Avatar>
    </StyleguideRow>
    <StyleguideRow label="PersonAvatar">
      {people.slice(0, 4).map((person) => (
        <PersonAvatar key={person.id} id={person.id} name={person.name} />
      ))}
    </StyleguideRow>
    <StyleguideRow label="AvatarStack">
      <AvatarStack people={people} label="7 people" />
      <span className="text-sm text-muted">7 people</span>
    </StyleguideRow>
  </StyleguideSection>
);
