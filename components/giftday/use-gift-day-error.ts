import { toast } from '@/components/ui/toast';
import { useTranslations } from 'next-intl';
import { knownAppError } from '../group/app-error-code';

const knownErrors = ['NOT_DRAWN', 'NOT_GIFT_DAY', 'REVEAL_OFF', 'EDITION_CLOSED', 'EDITION_CHANGED'] as const;

/** `onError` for gift day mutations: a toast with the localized reason. */
export const useGiftDayError = () => {
  const t = useTranslations('giftday.errors');
  return (error: unknown) => toast.add({ title: t(knownAppError(error, knownErrors)), type: 'error' });
};
