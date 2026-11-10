import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { useTRPCClient } from '@/lib/client/trpc';
import { Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

export const ExportButton = () => {
  const t = useTranslations('account');
  const client = useTRPCClient();
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const data = await client.account.export.query();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = Object.assign(document.createElement('a'), { href: url, download: 'givto-data.json' });
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.add({ title: t('errors.generic'), type: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="neutral" className="self-start" onClick={download} disabled={busy}>
      <Download aria-hidden="true" />
      {t('export.download')}
    </Button>
  );
};
