import { GivtoLogo } from '@/components/givto-logo';
import { cn } from '@/lib/utils';
import { useReducedMotion } from 'motion/react';
import { useAnimate } from 'motion/react-mini';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { celebrateMoves, loadingMoves } from './logo-moves';

type LogoAnimationProps = { variant: 'loading' | 'celebrate'; className?: string };

/**
 * The logo, animated (12). `loading` replaces the generic loader (announced as "Loading…");
 * `celebrate` is decorative. Reduced motion: the static logo. Motion's WAAPI-only `useAnimate`
 * keeps this small; not for the home page (37).
 */
export const LogoAnimation = ({ variant, className }: LogoAnimationProps) => {
  const t = useTranslations('ui');
  const reduced = useReducedMotion();
  const [scope, animate] = useAnimate<HTMLSpanElement>();

  useEffect(() => {
    if (reduced || !scope.current) return;
    const moves = variant === 'loading' ? loadingMoves : celebrateMoves;
    const controls = moves(animate, scope.current);
    return () => controls.forEach((control) => control.stop());
  }, [variant, reduced, animate, scope]);

  const logo = (
    <span
      ref={scope}
      className={cn(
        'inline-block size-16 [&_[data-part]]:origin-center [&_[data-part]]:[transform-box:fill-box]',
        className
      )}
    >
      <GivtoLogo aria-hidden="true" className="size-full overflow-visible" />
    </span>
  );
  if (variant === 'celebrate') return logo;
  return (
    <span role="status" className="flex justify-center py-8">
      {logo}
      <span className="sr-only">{t('loading')}</span>
    </span>
  );
};
