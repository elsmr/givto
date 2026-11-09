import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { Copy, QrCode, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { JoinQrCode } from './join-qr-code';
import { joinUrl } from './join-url';

type SharePanelProps = { slug: string; token: string; groupName: string };

/** Copy, Web Share and QR for the join link (45). */
export const SharePanel = ({ slug, token, groupName }: SharePanelProps) => {
  const t = useTranslations('group.share');
  const [canShare, setCanShare] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const url = joinUrl(slug, token);

  useEffect(() => setCanShare(typeof navigator.share === 'function'), []);

  const copy = async () => {
    await navigator.clipboard.writeText(url).then(
      () => toast.add({ title: t('copied'), type: 'success' }),
      () => toast.add({ title: t('copy-failed'), type: 'error' })
    );
  };

  const share = () =>
    navigator.share({ title: groupName, text: t('share-text', { group: groupName }), url }).catch(() => {});

  return (
    <div className="flex flex-col gap-4">
      <label htmlFor="join-link" className="sr-only">
        {t('link-label')}
      </label>
      <Input id="join-link" readOnly value={url} onFocus={(event) => event.target.select()} />
      <div className="flex flex-col gap-3 xs:flex-row xs:flex-wrap">
        <Button onClick={copy}>
          <Copy aria-hidden="true" />
          {t('copy')}
        </Button>
        {canShare && (
          <Button variant="neutral" onClick={share}>
            <Share2 aria-hidden="true" />
            {t('share')}
          </Button>
        )}
        <Button variant="neutral" aria-expanded={showQr} onClick={() => setShowQr(!showQr)}>
          <QrCode aria-hidden="true" />
          {showQr ? t('hide-qr') : t('show-qr')}
        </Button>
      </div>
      {showQr && <JoinQrCode url={url} label={t('qr-label', { group: groupName })} />}
    </div>
  );
};
