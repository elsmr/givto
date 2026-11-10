import { useMemo } from 'react';
import { encode } from 'uqr';

/** The join link as a QR code (one SVG path, ink on white) for showing on a phone or screen. */
export const JoinQrCode = ({ url, label }: { url: string; label: string }) => {
  const { size, path } = useMemo(() => {
    const { size, data } = encode(url, { ecc: 'M', border: 2 });
    const path = data
      .flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : '')))
      .join('');
    return { size, path };
  }, [url]);

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className="size-44 border-2 border-outline bg-white"
    >
      <path d={path} fill="#111111" />
    </svg>
  );
};
