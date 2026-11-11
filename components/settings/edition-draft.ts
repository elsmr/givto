import type { EditionDetailsDraft } from '@/components/create/use-create-draft';
import { editionDetailsInput } from '@/components/create/create-input';
import type { GroupEdition } from '@/components/group/group-data';
import type { RouterInputs } from '@/lib/client/trpc';
import { todayIn } from '@/lib/local-date';

/** The edition form's fields as typed text; the gift day and budget fields are the create flow's. */
export type EditionDraft = EditionDetailsDraft & {
  title: string;
  drawOn: string;
  wishlistBy: string;
  postBy: string;
  notes: string;
  avoidPreviousGiftees: boolean;
};

const amount = (cents: number) => String(cents / 100);

export const draftFromEdition = (edition: GroupEdition): EditionDraft => ({
  title: edition.title,
  giftDate: edition.giftDay?.date ?? '',
  giftTime: edition.giftDay?.time ?? '',
  exchangeMode: edition.exchangeMode,
  currency: edition.budget?.currency ?? 'EUR',
  budgetAmount: edition.budget ? amount(edition.budget.amount) : '',
  budgetMax: edition.budget?.maxAmount !== undefined ? amount(edition.budget.maxAmount) : '',
  drawOn: edition.drawAt ? todayIn(edition.timeZone, edition.drawAt) : '',
  wishlistBy: edition.wishlistBy ?? '',
  postBy: edition.postBy ?? '',
  notes: edition.notes ?? '',
  avoidPreviousGiftees: edition.avoidPreviousGiftees,
});

type EditionInput = RouterInputs['settings']['updateEdition'];

/** Empty fields are left out (the server unsets them); post-by only for posted exchanges. */
export const toEditionInput = (draft: EditionDraft, groupSlug: string, editionNumber: number): EditionInput => ({
  groupSlug,
  editionNumber,
  title: draft.title,
  exchangeMode: draft.exchangeMode,
  avoidPreviousGiftees: draft.avoidPreviousGiftees,
  ...editionDetailsInput(draft),
  ...(draft.drawOn && { drawOn: draft.drawOn }),
  ...(draft.wishlistBy && { wishlistBy: draft.wishlistBy }),
  ...(draft.postBy && draft.exchangeMode !== 'inPerson' && { postBy: draft.postBy }),
  ...(draft.notes.trim() && { notes: draft.notes }),
});
