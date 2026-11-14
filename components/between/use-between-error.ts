import { knownAppError } from '@/components/group/app-error-code';
import { useTranslations } from 'next-intl';

const knownErrors = ['INVALID_INPUT', 'RATE_LIMITED', 'EDITION_CLOSED', 'NOT_FOUND', 'WRONG_NUDGE_KIND'] as const;

/** A tip, question or Psst! mutation's error as a sentence, from the API's `appCode`. */
export const useBetweenError = () => {
  const t = useTranslations('between.errors');
  return (error: unknown): string => t(knownAppError(error, knownErrors));
};
