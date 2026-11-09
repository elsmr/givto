import type { RouterInputs, RouterOutputs } from '@/lib/client/trpc';
import type { WishKind } from '@/lib/schema/wish';

export type WishView = RouterOutputs['wish']['list'][number];
export type WishInput = RouterInputs['wish']['create'];
export type ImportedWish = RouterOutputs['import']['fromUrl'];

/** The add/edit form's state: strings as typed, converted to the API shape on submit. */
export interface WishDraft {
  kind: WishKind;
  title: string;
  description: string;
  url: string;
  imageId?: string;
  priceFrom: string;
  priceTo: string;
  currency: string;
  variant: string;
  reallyWant: boolean;
}

export const emptyDraft: WishDraft = {
  kind: 'wish',
  title: '',
  description: '',
  url: '',
  priceFrom: '',
  priceTo: '',
  currency: 'EUR',
  variant: '',
  reallyWant: false,
};

const toMajor = (cents: number | undefined) => (cents === undefined ? '' : String(cents / 100));
const toCents = (major: string) => (major.trim() === '' ? undefined : Math.round(Number(major) * 100));

export const draftFromWish = (wish: Partial<WishView & ImportedWish>): WishDraft => ({
  ...emptyDraft,
  ...(wish.kind && { kind: wish.kind }),
  title: wish.title ?? '',
  description: wish.description ?? '',
  url: wish.url ?? '',
  imageId: wish.imageId,
  priceFrom: toMajor(wish.price?.amount),
  priceTo: toMajor(wish.price?.maxAmount),
  currency: wish.price?.currency ?? emptyDraft.currency,
  variant: wish.variant ?? '',
  reallyWant: wish.reallyWant ?? false,
});

const optional = (text: string) => text.trim() || undefined;

export const draftToInput = (draft: WishDraft): WishInput => {
  const amount = toCents(draft.priceFrom);
  const maxAmount = toCents(draft.priceTo);
  return {
    kind: draft.kind,
    title: draft.title,
    description: optional(draft.description),
    url: optional(draft.url),
    imageId: draft.imageId,
    price:
      amount === undefined
        ? undefined
        : { currency: draft.currency, amount, ...(maxAmount !== undefined && { maxAmount }) },
    variant: optional(draft.variant),
    reallyWant: draft.reallyWant,
  };
};
