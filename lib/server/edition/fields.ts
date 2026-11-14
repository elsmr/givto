import type { Price } from '../../schema/common';
import { isPosted, type GiftDay } from '../../schema/edition';
import type { ExchangeMode } from '../../schema/group';

/** The call link only when gifts go by post (87). */
export const compactGiftDay = ({ date, time, place, callUrl }: GiftDay, exchangeMode: ExchangeMode): GiftDay => ({
  date,
  ...(time && { time }),
  ...(place && { place }),
  ...(callUrl && isPosted({ exchangeMode }) && { callUrl }),
});

export const compactPrice = ({ currency, amount, maxAmount }: Price): Price => ({
  currency,
  amount,
  ...(maxAmount !== undefined && { maxAmount }),
});
