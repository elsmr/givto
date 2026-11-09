import { cn } from '@/lib/utils';
import * as m from 'motion/react-m';
import { useTranslations } from 'next-intl';

const blocks = ['bg-primary', 'bg-coral', 'bg-yellow'];

export const Loader = ({ className }: { className?: string }) => {
  const t = useTranslations('ui');

  return (
    <span
      role="status"
      className={cn('inline-flex items-end gap-1.5', className)}
    >
      {blocks.map((color, index) => (
        <m.span
          key={color}
          aria-hidden="true"
          className={cn('size-3 border-2 border-ink', color)}
          animate={{ y: [0, -8, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: index * 0.12,
          }}
        />
      ))}
      <span className="sr-only">{t('loading')}</span>
    </span>
  );
};
