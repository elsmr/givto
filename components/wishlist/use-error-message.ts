import { appErrorCode } from '@/components/group/app-error-code';
import { useTranslations } from 'next-intl';

const keyByCode = {
  INVALID_INPUT: 'invalid',
  WISH_TAKEN: 'taken',
  WISHLIST_FULL: 'full',
  RATE_LIMITED: 'rate-limited',
} as const;

/** A wishlist mutation's error as a sentence, from the API's `appCode`. */
export const useErrorMessage = () => {
  const t = useTranslations('wishlist.errors');
  return (error: unknown): string => {
    const code = appErrorCode(error);
    return t(code in keyByCode ? keyByCode[code as keyof typeof keyByCode] : 'generic');
  };
};
