import { Coffee, Gamepad2, Headphones, type LucideIcon } from 'lucide-react';
import { Card, fade, Gift, ground, head, hidden, hop, move, Person, type Pose, pop, Stage, type Track, useLoop } from './parts';

const LOOP = 9.4;
const [a, b, c] = [40, 128, 216];
const people = [
  { x: a, fill: 'fill-primary' },
  { x: b, fill: 'fill-yellow' },
  { x: c, fill: 'fill-mint' },
];
const pile = { left: { x: 116, y: 34 }, top: { x: 128, y: 13 }, right: { x: 140, y: 34 } };
const origin: Pose = { x: 0, y: 0 };

const toss = (start: number, from: Pose, to: Pose): Track => move(start, 0.5, from, to, { lift: 14 });
const unwrap = (start: number): Record<'wrap' | 'item', Track> => ({
  wrap: [[start, origin], ...move(start, 0.3, origin, { x: 0, y: -10, opacity: 0, scale: 1.3, rotate: -20 })],
  item: [[start, hidden(origin)], ...pop(start + 0.1, origin)],
});

// Each gift is a person's, brought to the pile, then taken (and stolen) on turns that run left, middle, left, right.
const gifts: { id: string; Item: LucideIcon; opens: number; track: Track }[] = [
  {
    id: 'gamepad',
    Item: Gamepad2,
    opens: 2.9,
    track: [...pop(0.3, head(b)), ...toss(1.2, head(b), pile.top), ...toss(2.1, pile.top, head(a)), ...toss(3.8, head(a), head(b))],
  },
  { id: 'headphones', Item: Headphones, opens: 5.9, track: [...pop(0.3, head(a)), ...toss(0.6, head(a), pile.left), ...toss(5.1, pile.left, head(a))] },
  { id: 'coffee', Item: Coffee, opens: 7.4, track: [...pop(0.3, head(c)), ...toss(0.9, head(c), pile.right), ...toss(6.6, pile.right, head(c))] },
];

const tracks: Record<string, Track> = {
  'person-0': [...hop(0.6, ground(a)), ...hop(2.0, ground(a)), ...hop(5.0, ground(a))],
  'person-1': [...hop(1.2, ground(b)), ...hop(3.7, ground(b))],
  'person-2': [...hop(0.9, ground(c)), ...hop(6.5, ground(c))],
  ...Object.fromEntries(
    gifts.flatMap(({ id, opens, track }): [string, Track][] => {
      const { wrap, item } = unwrap(opens);
      return [
        [`gift-${id}`, [...track, ...fade(8.7, track.at(-1)![1])]],
        [`wrap-${id}`, wrap],
        [`item-${id}`, item],
      ];
    }),
  ),
};

/**
 * Wordless loop of a white elephant, above the explanation in the kind's (?) popover. Everyone puts
 * a wrapped gift on the pile; the first unwraps one, the second steals it, so the first goes again;
 * the last takes what's left. Reduced motion: everyone holding one opened gift.
 */
export const WhiteElephantAnimation = ({ playing, className }: { playing?: boolean; className?: string }) => {
  const scope = useLoop(tracks, LOOP, 8.2, playing);
  return (
    <Stage ref={scope} className={className}>
      {people.map(({ fill }, i) => (
        <g key={i} data-part={`person-${i}`}>
          <Person fill={fill} />
        </g>
      ))}
      {gifts.map(({ id, Item }) => (
        <g key={id} data-part={`gift-${id}`}>
          <g data-part={`item-${id}`}>
            <Card width={18} height={18}>
              <Item x={-6} y={-6} size={12} strokeWidth={2.25} className="text-outline" />
            </Card>
          </g>
          <g data-part={`wrap-${id}`}>
            <Gift />
          </g>
        </g>
      ))}
    </Stage>
  );
};
