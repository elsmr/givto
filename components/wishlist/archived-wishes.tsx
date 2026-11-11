import { Button } from '@/components/ui/button';
import { DisclosureCard } from '@/components/ui/disclosure-card';
import { toast } from '@/components/ui/toast';
import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';
import { Archive, ArchiveRestore } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DeleteWishDialog } from './delete-wish-dialog';
import { useErrorMessage } from './use-error-message';
import { useWishMutations } from './use-wish-mutations';
import { WishCard } from './wish-card';

/** "Archived (n)" under my list (76): archived and received wishes, to restore or delete for good. */
export const ArchivedWishes = () => {
  const t = useTranslations('wishlist.archive');
  const errorMessage = useErrorMessage();
  const archived = useQuery(useTRPC().wish.archived.queryOptions());
  const { restore } = useWishMutations();
  const wishes = archived.data ?? [];
  if (wishes.length === 0) return null;

  return (
    <DisclosureCard title={`${t('title')} (${wishes.length})`} icon={Archive} tone="primary-muted">
      <ul className="flex flex-col gap-4">
        {wishes.map((wish) => (
          <li key={wish.id}>
            <WishCard wish={wish} className="bg-page shadow-none">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="neutral"
                  size="sm"
                  aria-label={t('restore-label', { title: wish.title })}
                  disabled={restore.isPending}
                  onClick={() =>
                    restore.mutate(
                      { wishId: wish.id },
                      {
                        onSuccess: () => toast.add({ title: t('restored', { title: wish.title }), type: 'success' }),
                        onError: (error) => toast.add({ title: errorMessage(error), type: 'error' }),
                      }
                    )
                  }
                >
                  <ArchiveRestore aria-hidden="true" />
                  {t('restore')}
                </Button>
                <DeleteWishDialog wishId={wish.id} title={wish.title} />
              </div>
            </WishCard>
          </li>
        ))}
      </ul>
    </DisclosureCard>
  );
};
