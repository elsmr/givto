import { knownAppError } from '@/components/group/app-error-code';
import { toast } from '@/components/ui/toast';
import { useTranslations } from 'next-intl';

const knownErrors = ['GUESSING_CLOSED', 'NOT_FOUND', 'EDITION_CHANGED'] as const;

/** `onError` for Guess your Santa mutations: a toast with the localized reason. */
export const useGuessError = () => {
  const t = useTranslations('guess.errors');
  return (error: unknown) => toast.add({ title: t(knownAppError(error, knownErrors)), type: 'error' });
};
