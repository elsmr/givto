import { appErrorCode } from '@/components/group/app-error-code';
import { useTranslations } from 'next-intl';

const keyByCode = {
  INVALID_INPUT: 'invalid',
  RATE_LIMITED: 'rate-limited',
  EDITION_CLOSED: 'closed',
  NOT_FOUND: 'gone',
  WRONG_NUDGE_KIND: 'wrong-kind',
} as const;

/** A tip, question or Psst! mutation's error as a sentence, from the API's `appCode`. */
export const useBetweenError = () => {
  const t = useTranslations('between.errors');
  return (error: unknown): string => {
    const code = appErrorCode(error);
    return t(code in keyByCode ? keyByCode[code as keyof typeof keyByCode] : 'generic');
  };
};
