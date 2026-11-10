import type { Price } from './schema/common';

/** "€25" or "€20–€30" (51), in the UI and the emails. Amounts are cents. */
export const formatBudget = ({ currency, amount, maxAmount }: Price, locale: string): string => {
  const money = (cents: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
  return maxAmount !== undefined && maxAmount !== amount ? `${money(amount)}–${money(maxAmount)}` : money(amount);
};
