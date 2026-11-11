import { GivtoLogo } from '@/components/givto-logo';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import { encode, QrCodeDataType } from 'uqr';

// Fixed colours, not theme tokens: scanners need dark modules on a light ground, in dark mode too.
const INK = '#111111';
const CREAM = '#FFF8EC';
const PRIMARY = '#5A51FF';
/** Quiet zone in modules, as the QR spec asks. */
const BORDER = 4;

/**
 * The join link as a QR code for showing on a phone or screen: square ink modules on cream, the finder
 * eyes in primary, the logo in the middle. Error correction H leaves room for the modules the logo covers.
 */
export const JoinQrCode = ({ url, label, className }: { url: string; label: string; className?: string }) => {
  const { size, path, finders, logo } = useMemo(() => {
    const { size, data, types } = encode(url, { ecc: 'H', border: BORDER });
    const inner = size - 2 * BORDER;
    // About a fifth of the code, odd so it sits on the centre module, with one free module around it.
    const logoSize = Math.round(inner / 5) | 1;
    const logoStart = (size - logoSize) / 2;
    const underLogo = (n: number) => n >= logoStart - 1 && n < logoStart + logoSize + 1;
    const path = data
      .flatMap((row, y) =>
        row.map((dark, x) => {
          const drawn = dark && types[y][x] !== QrCodeDataType.Position && !(underLogo(x) && underLogo(y));
          return drawn ? `M${x} ${y}h1v1h-1z` : '';
        })
      )
      .join('');
    const far = size - BORDER - 7;
    const finders = [
      [BORDER, BORDER],
      [far, BORDER],
      [BORDER, far],
    ];
    return { size, path, finders, logo: { start: logoStart, size: logoSize } };
  }, [url]);

  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${size} ${size}`} className={cn('size-56 bordered shadow-md', className)}>
      <rect width={size} height={size} fill={CREAM} />
      <path d={path} fill={INK} shapeRendering="crispEdges" />
      {finders.map(([x, y]) => (
        <g key={`${x}-${y}`} shapeRendering="crispEdges">
          <path d={`M${x} ${y}h7v7h-7zM${x + 1} ${y + 1}v5h5v-5z`} fill={INK} fillRule="evenodd" />
          <rect x={x + 2} y={y + 2} width={3} height={3} fill={PRIMARY} />
        </g>
      ))}
      <GivtoLogo x={logo.start} y={logo.start} width={logo.size} height={logo.size} />
    </svg>
  );
};
