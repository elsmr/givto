/** @jsxImportSource react */
import { color, font } from './tokens';

export const ItemList = ({ items }: { items: string[] }) => (
  <ul className="text" style={{ margin: '0 0 16px', paddingLeft: 22, fontFamily: font.body, fontSize: 16, lineHeight: '24px', color: color.ink }}>
    {items.map((item, index) => (
      <li key={index} style={{ margin: '0 0 4px' }}>
        {item}
      </li>
    ))}
  </ul>
);
