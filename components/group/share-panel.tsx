import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from '@/components/ui/toast';
import { withTooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Check, Copy, QrCode, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { JoinQrCode } from './join-qr-code';
import { joinUrl } from './join-url';

type SharePanelProps = { slug: string; token: string; groupName: string; locale: string; primary?: boolean };

const segment = 'h-auto min-h-11 shrink-0 border-0 border-l-2 border-outline';

/**
 * The join link (45) as one row with Copy, QR (in a popover) and Share (where the browser can) attached.
 * `primary`: copying is the screen's main action, so Copy is filled and says what it does.
 */
export const SharePanel = ({ slug, token, groupName, locale, primary = false }: SharePanelProps) => {
  const t = useTranslations('group.share');
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const url = joinUrl(slug, token, locale);

  useEffect(() => setCanShare(typeof navigator.share === 'function'), []);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = () =>
    navigator.clipboard.writeText(url).then(
      () => {
        setCopied(true);
        toast.add({ title: t('copied'), type: 'success' });
      },
      () => toast.add({ title: t('copy-failed'), type: 'error' })
    );

  const share = () =>
    navigator.share({ title: groupName, text: t('share-text', { group: groupName }), url }).catch(() => {});

  const CopyIcon = copied ? Check : Copy;
  return (
    <div className="flex items-stretch bg-surface bordered shadow-md">
      <label htmlFor="join-link" className="sr-only">
        {t('link-label')}
      </label>
      <Input id="join-link" readOnly value={url} onFocus={(event) => event.target.select()} className="mono h-auto min-h-11 flex-1 truncate border-0 text-sm" />
      {primary ? (
        <Button variant="ghost" onClick={copy} className={cn(segment, 'bg-primary text-white hover:bg-primary')}>
          <CopyIcon aria-hidden="true" />
          {t('copy')}
        </Button>
      ) : (
        withTooltip(
          t('copy'),
          <Button variant="ghost" size="icon" onClick={copy} className={segment}>
            <CopyIcon aria-hidden="true" />
          </Button>
        )
      )}
      <Popover>
        {withTooltip(
          t('show-qr'),
          <PopoverTrigger render={<Button variant="ghost" size="icon" className={segment} />}>
            <QrCode aria-hidden="true" />
          </PopoverTrigger>
        )}
        <PopoverContent align="end" aria-label={t('qr-label', { group: groupName })} className="w-auto">
          <JoinQrCode url={url} label={t('qr-label', { group: groupName })} />
        </PopoverContent>
      </Popover>
      {canShare &&
        withTooltip(
          t('share'),
          <Button variant="ghost" size="icon" onClick={share} className={segment}>
            <Share2 aria-hidden="true" />
          </Button>
        )}
    </div>
  );
};
