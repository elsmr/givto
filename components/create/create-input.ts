import type { RouterInputs } from '@/lib/client/trpc';
import type { CreateDraft, EditionDetailsDraft } from './use-create-draft';

const cents = (amount: string) => Math.round(Number(amount.replace(',', '.')) * 100);

/** Gift day and budget as API input; absent when not filled in. Shared with the settings. */
export const editionDetailsInput = (draft: EditionDetailsDraft) => ({
  ...(draft.giftDate && {
    giftDay: {
      date: draft.giftDate,
      ...(draft.giftTime && { time: draft.giftTime }),
    },
  }),
  ...(draft.budgetAmount && {
    budget: {
      currency: draft.currency,
      amount: cents(draft.budgetAmount),
      ...(draft.budgetMax && { maxAmount: cents(draft.budgetMax) }),
    },
  }),
});

export const toCreateInput = (draft: CreateDraft, timeZone: string): RouterInputs['group']['create'] => ({
  name: draft.name,
  timeZone,
  exchangeMode: draft.exchangeMode,
  ...(draft.kind !== 'secretSanta' && { kind: draft.kind }),
  ...editionDetailsInput(draft),
});
