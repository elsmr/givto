import type { Price } from '@/lib/schema/common';

/** "€ 15,00 – € 25,00" in the viewer's locale, in the currency the wish was entered in. */
export const formatPrice = (price: Price, locale: string): string => {
  const format = (cents: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency: price.currency }).format(cents / 100);
  return price.maxAmount === undefined ? format(price.amount) : `${format(price.amount)} – ${format(price.maxAmount)}`;
};

/** A wish fits the budget when its (lowest) price is at most the budget's upper end, same currency. */
export const isInBudget = (price: Price | undefined, budget: Price | undefined): boolean =>
  !!price && !!budget && price.currency === budget.currency && price.amount <= (budget.maxAmount ?? budget.amount);
