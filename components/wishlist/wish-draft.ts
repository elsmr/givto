import type { RouterInputs, RouterOutputs } from '@/lib/client/trpc';
import type { WishKind, WishLink } from '@/lib/schema/wish';

export type WishView = RouterOutputs['wish']['list'][number];
export type WishInput = RouterInputs['wish']['create'];
export type ImportedWish = RouterOutputs['import']['fromUrl'];

/** The add/edit form's state: strings as typed, converted to the API shape on submit. */
export interface WishDraft {
  kind: WishKind;
  title: string;
  description: string;
  links: WishLink[];
  price: string;
  currency: string;
  variant: string;
  reallyWant: boolean;
}

export const emptyDraft: WishDraft = {
  kind: 'wish',
  title: '',
  description: '',
  links: [],
  price: '',
  currency: 'EUR',
  variant: '',
  reallyWant: false,
};

const toMajor = (cents: number | undefined) => (cents === undefined ? '' : String(cents / 100));
const toCents = (major: string) => (major.trim() === '' ? undefined : Math.round(Number(major) * 100));

export const draftFromWish = (wish: WishView): WishDraft => ({
  ...emptyDraft,
  kind: wish.kind,
  title: wish.title,
  description: wish.description ?? '',
  links: wish.links,
  price: toMajor(wish.price?.amount),
  currency: wish.price?.currency ?? emptyDraft.currency,
  variant: wish.variant ?? '',
  reallyWant: wish.reallyWant ?? false,
});

/** A pasted link as read by the server; when the wish has no title yet, it takes the product's title, notes and price. */
export const addImportedLink = (draft: WishDraft, { url, title, description, price, imageId }: ImportedWish): WishDraft => {
  const link: WishLink = { url, ...(title && { title }), ...(price && { price }), ...(imageId && { imageId }) };
  const links = [...draft.links, link];
  if (draft.title.trim()) return { ...draft, links };
  return {
    ...draft,
    links,
    title: title ?? '',
    description: draft.description || description || '',
    ...(price && { price: toMajor(price.amount), currency: price.currency }),
  };
};

const optional = (text: string) => text.trim() || undefined;

export const draftToInput = (draft: WishDraft): WishInput => {
  const amount = toCents(draft.price);
  return {
    kind: draft.kind,
    title: draft.title,
    description: optional(draft.description),
    links: draft.links,
    price: amount === undefined ? undefined : { currency: draft.currency, amount },
    variant: optional(draft.variant),
    reallyWant: draft.reallyWant,
  };
};
