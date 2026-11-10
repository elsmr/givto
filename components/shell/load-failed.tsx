import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

/** Data that didn't load (network, server): say so and offer "Try again", so it's no dead end (25). */
export const LoadFailed = ({ message, onRetry }: { message: string; onRetry: () => void }) => {
  const t = useTranslations('shell');
  return (
    <Alert variant="danger">
      <AlertTitle>{message}</AlertTitle>
      <Button variant="neutral" size="sm" className="col-start-2 mt-2 justify-self-start" onClick={onRetry}>
        {t('retry')}
      </Button>
    </Alert>
  );
};
