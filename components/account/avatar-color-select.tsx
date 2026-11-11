import { avatarFills } from '@/components/group/person-avatar';
import { FieldError, FieldLegend, FieldSet } from '@/components/ui/field';
import { useTRPC } from '@/lib/client/trpc';
import { avatarColors, type AvatarColor } from '@/lib/schema/user';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

/** Native radios drawn as avatar squares with the person's initial; a pick saves at once and shows in every group. */
export const AvatarColorSelect = ({ name, color }: { name: string; color?: AvatarColor }) => {
  const t = useTranslations('account.profile');
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [choice, setChoice] = useState(color);
  const save = useMutation(
    trpc.account.setAvatarColor.mutationOptions({
      onError: () => setChoice(color),
      onSettled: () => queryClient.invalidateQueries({ queryKey: trpc.me.get.queryKey() }),
    })
  );
  const choose = (next: AvatarColor) => {
    setChoice(next);
    save.mutate({ avatarColor: next });
  };

  return (
    <FieldSet className="gap-2">
      <FieldLegend variant="label" className="font-semibold" hint={t('color-hint')}>
        {t('color-label')}
      </FieldLegend>
      <div className="flex flex-wrap gap-3">
        {avatarColors.map((option) => (
          <label
            key={option}
            className="grid size-11 cursor-pointer place-items-center has-checked:-translate-x-0.5 has-checked:-translate-y-0.5 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-3 has-[:focus-visible]:outline-focus has-[:focus-visible]:outline-solid"
          >
            <input
              type="radio"
              name="avatar-color"
              value={option}
              checked={choice === option}
              onChange={() => choose(option)}
              aria-label={t(`colors.${option}`)}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className={cn(
                'grid size-full place-items-center border-2 border-outline font-bold text-ink peer-checked:shadow-sm peer-checked:ring-2 peer-checked:ring-outline peer-checked:ring-offset-2 peer-checked:ring-offset-page',
                avatarFills[option]
              )}
            >
              {name.trim().slice(0, 1).toUpperCase()}
            </span>
          </label>
        ))}
      </div>
      {save.error && <FieldError>{t('color-error')}</FieldError>}
    </FieldSet>
  );
};
