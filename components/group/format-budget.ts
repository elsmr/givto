import type { Price } from '@/lib/schema/common';
import type { useFormatter } from 'next-intl';

/** "€25" or "€20–€30" (51). Amounts are cents. */
export const formatBudget = (format: ReturnType<typeof useFormatter>, { currency, amount, maxAmount }: Price) => {
  const money = (cents: number) =>
    format.number(cents / 100, { style: 'currency', currency, maximumFractionDigits: cents % 100 ? 2 : 0 });
  return maxAmount !== undefined && maxAmount !== amount ? `${money(amount)}–${money(maxAmount)}` : money(amount);
};
