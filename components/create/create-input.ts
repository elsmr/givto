import type { RouterInputs } from '@/lib/client/trpc';
import type { CreateDraft } from './use-create-draft';

const cents = (amount: string) => Math.round(Number(amount.replace(',', '.')) * 100);

export const toCreateInput = (draft: CreateDraft, timeZone: string): RouterInputs['group']['create'] => ({
  name: draft.name,
  organizerName: draft.organizerName,
  timeZone,
  exchangeMode: draft.exchangeMode,
  ...(draft.giftDate && {
    giftDay: {
      date: draft.giftDate,
      ...(draft.giftTime && { time: draft.giftTime }),
      ...(draft.place.trim() && { place: draft.place }),
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
