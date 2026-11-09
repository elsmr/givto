/** @jsxImportSource react */
import { presentation } from './attrs';
import { color, font } from './tokens';

/** Someone's own words (a question, an answer): React escapes the text; line breaks become <br>. */
export const Quote = ({ children }: { children: string }) => (
  <table {...presentation} width="100%" style={{ margin: '0 0 16px' }}>
    <tbody>
      <tr>
        <td
          className="text"
          style={{
            borderLeft: `6px solid ${color.primary}`,
            padding: '4px 0 4px 16px',
            fontFamily: font.body,
            fontSize: 18,
            lineHeight: '26px',
            color: color.ink,
          }}
        >
          {children.split('\n').flatMap((line, index) => (index === 0 ? [line] : [<br key={index} />, line]))}
        </td>
      </tr>
    </tbody>
  </table>
);
