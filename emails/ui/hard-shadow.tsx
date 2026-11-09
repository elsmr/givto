/** @jsxImportSource react */
import type { CSSProperties, ReactNode } from 'react';
import { bgcolor, presentation } from './attrs';
import { BORDER, color } from './tokens';

interface HardShadowProps {
  children: ReactNode;
  /** Fill of the bordered box. */
  fill: string;
  offset?: number;
  shadow?: string;
  /** Classes for dark mode (head.tsx): the box's fill and the shadow colour. */
  fillClass?: string;
  shadowClass?: string;
  width?: string | number;
  boxStyle?: CSSProperties;
}

const spacer: CSSProperties = { fontSize: 0, lineHeight: 0, msoLineHeightRule: 'exactly' } as CSSProperties;

/**
 * A bordered box with a solid offset shadow, built from table cells (07: option b): a column
 * on the right and a row below, each starting with a page-coloured notch. Only bgcolor,
 * width and height, so Outlook's Word engine draws it too; box-shadow would vanish there.
 */
export const HardShadow = ({ children, fill, offset = 6, shadow = color.ink, fillClass, shadowClass = 'shadow-ink', width = '100%', boxStyle }: HardShadowProps) => {
  const shadowCell = { ...bgcolor(shadow), 'data-skip-in-text': 'true', className: shadowClass, style: { ...spacer, backgroundColor: shadow } };
  const notch = { ...bgcolor(color.page), 'data-skip-in-text': 'true', className: 'bg-page', style: { ...spacer, backgroundColor: color.page } };
  return (
    <table {...presentation} width={width} style={{ borderCollapse: 'separate' }}>
      <tbody>
        <tr>
          <td
            colSpan={2}
            {...bgcolor(fill)}
            className={`ink-border ${fillClass ?? ''}`.trim()}
            style={{ backgroundColor: fill, border: `${BORDER}px solid ${color.ink}`, ...boxStyle }}
          >
            {children}
          </td>
          <td width={offset} valign="top" {...shadowCell}>
            <table {...presentation} width={offset}>
              <tbody>
                <tr>
                  <td height={offset} {...notch}>
                    &nbsp;
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
        <tr>
          <td width={offset} height={offset} {...notch}>
            &nbsp;
          </td>
          <td height={offset} {...shadowCell}>
            &nbsp;
          </td>
          <td width={offset} height={offset} {...shadowCell}>
            &nbsp;
          </td>
        </tr>
      </tbody>
    </table>
  );
};
