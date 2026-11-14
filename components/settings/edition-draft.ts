import type { EditionDetailsDraft } from '@/components/create/use-create-draft';
import { editionDetailsInput } from '@/components/create/create-input';
import type { GroupEdition } from '@/components/group/group-data';
import type { RouterInputs } from '@/lib/client/trpc';
import { toMajor } from '@/lib/format-budget';
import { todayIn } from '@/lib/local-date';
import { drawsNames, type EditionKind } from '@/lib/schema/edition';

/** The edition form's fields as typed text; the gift day and budget fields are the create flow's. */
export type EditionDraft = EditionDetailsDraft & {
  title: string;
  kind: EditionKind;
  drawOn: string;
  wishlistBy: string;
  postBy: string;
  callUrl: string;
  notes: string;
};

export const draftFromEdition = (edition: GroupEdition): EditionDraft => ({
  title: edition.title,
  kind: edition.kind,
  giftDate: edition.giftDay?.date ?? '',
  giftTime: edition.giftDay?.time ?? '',
  exchangeMode: edition.exchangeMode,
  currency: edition.budget?.currency ?? 'EUR',
  budgetAmount: edition.budget ? toMajor(edition.budget.amount) : '',
  budgetMax: edition.budget?.maxAmount !== undefined ? toMajor(edition.budget.maxAmount) : '',
  drawOn: edition.drawAt ? todayIn(edition.timeZone, edition.drawAt) : '',
  wishlistBy: edition.wishlistBy ?? '',
  postBy: edition.postBy ?? '',
  callUrl: edition.giftDay?.callUrl ?? '',
  notes: edition.notes ?? '',
});

type EditionInput = RouterInputs['settings']['updateEdition'];

/**
 * Empty fields are left out (the server unsets them); post-by and the call link only for posted exchanges. Without a
 * draw (88) the form hides the draw date, wishlist deadline and the exchange: those are left out too.
 */
export const toEditionInput = (draft: EditionDraft, groupSlug: string, editionNumber: number): EditionInput => {
  const draws = drawsNames(draft);
  const exchangeMode = draws ? draft.exchangeMode : 'inPerson';
  const details = editionDetailsInput(draft);
  const callUrl = exchangeMode !== 'inPerson' && draft.callUrl.trim();
  return {
    groupSlug,
    editionNumber,
    title: draft.title,
    kind: draft.kind,
    exchangeMode,
    ...details,
    ...(details.giftDay && callUrl && { giftDay: { ...details.giftDay, callUrl } }),
    ...(draws && draft.drawOn && { drawOn: draft.drawOn }),
    ...(draws && draft.wishlistBy && { wishlistBy: draft.wishlistBy }),
    ...(draft.postBy && exchangeMode !== 'inPerson' && { postBy: draft.postBy }),
    ...(draft.notes.trim() && { notes: draft.notes }),
  };
};
