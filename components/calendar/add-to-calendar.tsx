import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuLinkItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { editionCalendarEvents, googleCalendarUrl, outlookCalendarUrl, toIcs } from '@/lib/calendar';
import { CalendarPlus, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { GroupEdition } from '../group/group-data';

type AddToCalendarProps = { groupSlug: string; groupName: string; edition: GroupEdition };

/** Gift day (and post-by) as .ics or Google/Outlook links (47). Client only: group data loads in the browser. */
export const AddToCalendar = ({ groupSlug, groupName, edition }: AddToCalendarProps) => {
  const t = useTranslations('draw.calendar');
  const events = editionCalendarEvents(
    { ...edition, groupSlug, editionNumber: edition.number },
    {
      giftDay: t('gift-day', { group: groupName }),
      postBy: t('post-by', { group: groupName }),
      description: t('description', { url: `${window.location.origin}/g/${groupSlug}` }),
    }
  );
  if (events.length === 0) return null;

  const download = () => {
    const url = URL.createObjectURL(new Blob([toIcs(events)], { type: 'text/calendar;charset=utf-8' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: `givto-${groupSlug}-${edition.number}.ics` });
    link.click();
    URL.revokeObjectURL(url);
  };
  const external = (href: string) => <a href={href} target="_blank" rel="noopener noreferrer" />;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="neutral" className="self-start" />}>
        <CalendarPlus aria-hidden="true" />
        {t('button')}
        <ChevronDown aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={download}>{t('ics')}</DropdownMenuItem>
        <DropdownMenuSeparator />
        {events.map((event) => (
          <DropdownMenuGroup key={event.uid}>
            {events.length > 1 && <DropdownMenuLabel>{event.title}</DropdownMenuLabel>}
            <DropdownMenuLinkItem render={external(googleCalendarUrl(event))}>{t('google')}</DropdownMenuLinkItem>
            <DropdownMenuLinkItem render={external(outlookCalendarUrl(event))}>{t('outlook')}</DropdownMenuLinkItem>
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
