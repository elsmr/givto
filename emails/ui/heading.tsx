/** @jsxImportSource react */
import { color, font } from './tokens';

export const Heading = ({ children }: { children: string }) => (
  <h1
    className="text"
    style={{ margin: '0 0 16px', fontFamily: font.heading, fontSize: 28, lineHeight: '34px', fontWeight: 800, color: color.ink }}
  >
    {children}
  </h1>
);
