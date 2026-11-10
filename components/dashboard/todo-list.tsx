import { buttonVariants } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { IconTile, type Tone } from '@/components/ui/icon-tile';
import { ArrowRight, Check, Heart, MessageCircleQuestion, PackageCheck, PartyPopper, Send, Shuffle, UserPlus, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { DashboardGroup } from './group-card';

type Todo = DashboardGroup['todos'][number];

// Listed in this order: what's happening today first, set-up chores last.
const kinds: Record<Todo['kind'], { icon: LucideIcon; tone: Tone; hash?: string }> = {
  giftDay: { icon: PartyPopper, tone: 'coral' },
  question: { icon: MessageCircleQuestion, tone: 'yellow' },
  joinRequests: { icon: UserPlus, tone: 'primary-muted' },
  readyToDraw: { icon: Shuffle, tone: 'yellow' },
  draft: { icon: Send, tone: 'primary-muted' },
  noWishes: { icon: Heart, tone: 'coral', hash: '#wishlist' },
  markReceived: { icon: PackageCheck, tone: 'mint' },
};
const order = Object.keys(kinds);

/** Everything across my groups that needs me, one row per to-do with one action. */
export const TodoList = ({ groups }: { groups: DashboardGroup[] }) => {
  const t = useTranslations('dashboard.todo');
  const todos = groups
    .flatMap((group) => group.todos.map((todo) => ({ todo, group })))
    .toSorted((a, b) => order.indexOf(a.todo.kind) - order.indexOf(b.todo.kind));

  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <CardTitle>
          <h2 className="flex items-center gap-3">
            {t('title')}
            {todos.length > 0 && <span className="mono bg-ink px-2 text-base text-page tabular-nums">{todos.length}</span>}
          </h2>
        </CardTitle>
      </CardHeader>
      {todos.length === 0 ? (
        <p className="flex items-center gap-3 border-t-2 border-dashed border-outline px-6 py-4 text-muted">
          <IconTile icon={Check} tone="mint" className="size-9" />
          {t('all-done')}
        </p>
      ) : (
        <ul>
          {todos.map(({ todo, group }) => {
            const { icon, tone, hash = '' } = kinds[todo.kind];
            return (
              <li key={`${group.slug}-${todo.kind}`} className="border-t-2 border-dashed border-outline">
                <Link
                  href={`/g/${group.slug}${hash}`}
                  className="flex items-center gap-3 px-4 py-3 text-ink no-underline hover:bg-page sm:px-6"
                >
                  <IconTile icon={icon} tone={tone} className="size-9" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{t(`${todo.kind}.text`, { count: ('count' in todo && todo.count) || 0 })}</span>
                    <span className="block text-sm text-muted">{group.name}</span>
                  </span>
                  <span className={buttonVariants({ variant: 'neutral', size: 'sm', className: 'max-xs:hidden' })}>
                    {t(`${todo.kind}.action`)}
                  </span>
                  <ArrowRight aria-hidden="true" className="size-5 shrink-0 xs:hidden" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
};
