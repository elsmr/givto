/** @jsxImportSource react */
import type { ReactNode } from 'react';
import { color, font } from './tokens';

export const Text = ({ children, muted = false }: { children: ReactNode; muted?: boolean }) => (
  <p
    className={muted ? 'text-muted' : 'text'}
    style={{
      margin: '0 0 16px',
      fontFamily: font.body,
      fontSize: muted ? 14 : 16,
      lineHeight: muted ? '20px' : '24px',
      color: muted ? color.textMuted : color.ink,
    }}
  >
    {children}
  </p>
);
