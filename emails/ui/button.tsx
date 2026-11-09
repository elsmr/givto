/** @jsxImportSource react */
import { presentation } from './attrs';
import { HardShadow } from './hard-shadow';
import { color, font } from './tokens';

/**
 * Bulletproof button (07): the link fills a bordered, coloured cell (no images, no VML),
 * with the hard shadow from table cells. 48px tall: a comfortable tap target.
 */
export const Button = ({ href, children }: { href: string; children: string }) => (
  <table {...presentation} style={{ margin: '8px 0 24px' }}>
    <tbody>
      <tr>
        <td>
          <HardShadow fill={color.primary} offset={4} width="auto">
            <a
              href={href}
              target="_blank"
              style={{
                display: 'block',
                padding: '13px 24px',
                fontFamily: font.body,
                fontSize: 16,
                lineHeight: '22px',
                fontWeight: 700,
                color: '#FFFFFF',
                textDecoration: 'none',
                backgroundColor: color.primary,
              }}
            >
              {children}
            </a>
          </HardShadow>
        </td>
      </tr>
    </tbody>
  </table>
);
