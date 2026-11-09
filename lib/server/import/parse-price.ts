const MAX_AMOUNT = 100_000_000;

const CURRENCY_SYMBOLS: Record<string, string> = { '€': 'EUR', $: 'USD', '£': 'GBP' };

/** ISO 4217 code from a code or a common symbol. */
export const parseCurrency = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (/^[a-z]{3}$/i.test(trimmed)) return trimmed.toUpperCase();
  return CURRENCY_SYMBOLS[trimmed];
};

/**
 * Minor units (cents) from "24.99", "24,99", "1.299,00", "1,299.00", "€ 25,-" or a number.
 * The last separator followed by one or two digits is the decimal one.
 */
export const parseAmount = (value: unknown): number | undefined => {
  let major: number;
  if (typeof value === 'number') {
    major = value;
  } else if (typeof value === 'string') {
    const digits = value.replace(/[^\d.,]/g, '').replace(/[.,]+$/, '');
    if (!/\d/.test(digits)) return undefined;
    const decimal = digits.match(/^(.*)[.,](\d{1,2})$/);
    major = decimal
      ? Number(`${decimal[1].replace(/[.,]/g, '') || '0'}.${decimal[2]}`)
      : Number(digits.replace(/[.,]/g, ''));
  } else {
    return undefined;
  }
  const cents = Math.round(major * 100);
  return Number.isFinite(cents) && cents >= 0 && cents <= MAX_AMOUNT ? cents : undefined;
};
