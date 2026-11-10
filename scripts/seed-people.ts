// Demo people and their wishlists for `pnpm seed` (scripts/seed.ts).
import type { Locale, Price } from '../lib/schema/common';
import type { WishFields } from '../lib/schema/wish';

export type Person = { key: string; name: string; email: string; locale: Locale };

export const eur = (euros: number, maxEuros?: number): Price => ({
  currency: 'EUR',
  amount: euros * 100,
  ...(maxEuros !== undefined && { maxAmount: maxEuros * 100 }),
});
const shop = (path: string) => `https://example.com/shop/${path}`;

export const people = (seedEmail: string): Person[] => [
  { key: 'you', name: 'Alex Janssens', email: seedEmail, locale: 'en' },
  ...[
    ['ann', 'Ann Peeters'],
    ['bram', 'Bram Willems'],
    ['chloe', 'Chloé Maes', 'nl'],
    ['dries', 'Dries Claes'],
    ['eva', 'Eva Wouters'],
    ['femke', 'Femke Jacobs', 'nl'],
    ['gilles', 'Gilles Dubois'],
    ['hanne', 'Hanne Mertens'],
    ['jonas', 'Jonas Goossens'],
  ].map(([key, name, locale]) => ({ key, name, email: `${key}@example.test`, locale: (locale ?? 'en') as Locale })),
];

type SeedWish = Partial<WishFields> & Pick<WishFields, 'title'>;

/** Dries has none: his Santa sees an empty wishlist and can send a Psst!. */
export const wishlists: Record<string, SeedWish[]> = {
  you: [
    { title: 'Moka pot, 6 cups', price: eur(35), url: shop('moka-pot'), reallyWant: true },
    { title: 'Wool socks', variant: 'Size 43-46', price: eur(15) },
    { title: 'Kafka on the Shore', description: 'Paperback is fine.', price: eur(12), url: shop('kafka-on-the-shore') },
    { kind: 'surpriseMe', title: 'Surprise me: something for the garden' },
  ],
  ann: [
    { title: 'Pottery workshop voucher', price: eur(40, 60), url: shop('pottery-workshop'), reallyWant: true },
    { title: 'Linen apron', variant: 'Sage green', price: eur(29) },
  ],
  bram: [
    { title: 'Board game: Cascadia', price: eur(35), url: shop('cascadia') },
    { title: 'Rechargeable bike lights', price: eur(25) },
  ],
  chloe: [
    { title: 'Monstera plant', description: 'A small one, my flat is tiny.', price: eur(20) },
    { title: 'Scented candle', variant: 'Fig or cedar', price: eur(18), url: shop('candle') },
    { kind: 'donation', title: 'A donation to the animal shelter', url: shop('animal-shelter') },
  ],
  eva: [
    { title: 'Fountain pen', price: eur(30), url: shop('fountain-pen'), reallyWant: true },
    { title: 'Dotted A5 notebook', price: eur(14) },
  ],
  femke: [
    { title: 'Yoga mat', variant: 'Not purple', price: eur(45), url: shop('yoga-mat') },
    { title: 'Loose-leaf tea sampler', price: eur(22) },
  ],
  gilles: [
    { title: 'Hot sauce gift set', price: eur(28), url: shop('hot-sauce') },
    { title: 'Kind of Blue on vinyl', price: eur(25) },
  ],
  hanne: [
    { title: '1000-piece puzzle', description: 'Landscapes, no cats please.', price: eur(19) },
    { title: 'Ottolenghi cookbook', price: eur(30), url: shop('cookbook') },
  ],
  jonas: [
    { title: 'Headphone case', price: eur(15) },
    { title: 'Climbing chalk bag', variant: 'Any colour', price: eur(20), url: shop('chalk-bag') },
  ],
};
