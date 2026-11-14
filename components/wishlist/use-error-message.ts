import { knownAppError } from '@/components/group/app-error-code';
import { useTranslations } from 'next-intl';

const knownErrors = ['INVALID_INPUT', 'WISH_TAKEN', 'WISHLIST_FULL', 'ARCHIVE_FULL', 'RATE_LIMITED'] as const;

/** A wishlist mutation's error as a sentence, from the API's `appCode`. */
export const useErrorMessage = () => {
  const t = useTranslations('wishlist.errors');
  return (error: unknown): string => t(knownAppError(error, knownErrors));
};
