import type { Price } from '@/lib/schema/common';

/** A wish fits the budget when its (lowest) price is at most the budget's upper end, same currency. */
export const isInBudget = (price: Price | undefined, budget: Price | undefined): boolean =>
  !!price && !!budget && price.currency === budget.currency && price.amount <= (budget.maxAmount ?? budget.amount);
