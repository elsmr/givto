/** @jsxImportSource react */
import { presentation } from './attrs';
import { HardShadow } from './hard-shadow';
import { color, font } from './tokens';

/** A one-time code, big and easy to copy; yellow with ink text in both colour schemes. */
export const CodeBox = ({ code }: { code: string }) => (
  <table {...presentation} style={{ margin: '0 0 24px' }}>
    <tbody>
      <tr>
        <td>
          <HardShadow fill={color.yellow} offset={4} width="auto" boxStyle={{ padding: '12px 20px' }}>
            <span style={{ fontFamily: font.code, fontSize: 32, lineHeight: '40px', fontWeight: 700, letterSpacing: 6, color: color.ink }}>
              {code}
            </span>
          </HardShadow>
        </td>
      </tr>
    </tbody>
  </table>
);
