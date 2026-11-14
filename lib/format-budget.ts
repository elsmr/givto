import type { Price } from './schema/common';

/** "€25" or "€20–€30" (51), in the UI and the emails. Amounts are cents. */
export const formatBudget = ({ currency, amount, maxAmount }: Price, locale: string): string => {
  const money = (cents: number) =>
    new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: cents % 100 ? 2 : 0 }).format(cents / 100);
  return maxAmount !== undefined && maxAmount !== amount ? `${money(amount)}–${money(maxAmount)}` : money(amount);
};

/** The currencies the wish price and budget pickers offer. */
export const CURRENCIES: readonly string[] = ['EUR', 'USD', 'GBP', 'CHF', 'SEK', 'DKK', 'NOK', 'PLN'];

/** Cents from an amount as typed: "12.5" or "12,50". */
export const toCents = (major: string) => Math.round(Number(major.replace(',', '.')) * 100);

/** Cents as a price field's text. */
export const toMajor = (cents: number) => String(cents / 100);
