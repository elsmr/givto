import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useTRPCClient } from '@/lib/client/trpc';
import { useMutation } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { useTranslations } from 'next-intl';

export const ExportButton = () => {
  const t = useTranslations('account');
  const client = useTRPCClient();
  const download = useMutation({
    mutationFn: () => client.account.export.query(),
    onSuccess: (data) => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = Object.assign(document.createElement('a'), { href: url, download: 'givto-data.json' });
      link.click();
      URL.revokeObjectURL(url);
    },
    onError: () => toast.add({ title: t('errors.generic'), type: 'error' }),
  });

  return (
    <Button variant="neutral" className="self-start" onClick={() => download.mutate()} disabled={download.isPending}>
      <Download aria-hidden="true" />
      {t('export.download')}
    </Button>
  );
};
