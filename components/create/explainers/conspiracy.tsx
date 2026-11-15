import { Card, fade, Gift, ground, head, hidden, hop, move, Person, type Pose, pop, Stage, type Track, useLoop } from './parts';

const LOOP = 7.2;
const helpers = [
  { x: 36, fill: 'fill-primary', note: { x: 60, y: 22 } },
  { x: 84, fill: 'fill-yellow', note: { x: 84, y: 31 } },
  { x: 132, fill: 'fill-mint', note: { x: 108, y: 22 } },
];
const target = 216;
const board: Pose = { x: 84, y: 26 };
const WALL = { x: 170, top: 36 };
const origin: Pose = { x: 0, y: 0 };
const lifted: Pose = { x: 0, y: -24 };
const pinAt = (i: number) => 0.3 + 0.5 * i;

const tracks: Record<string, Track> = {
  ...Object.fromEntries(
    helpers.flatMap(({ x, note }, i): [string, Track][] => [
      [`helper-${i}`, [...hop(pinAt(i), ground(x)), ...hop(2.7, ground(x))]],
      [
        `note-${i}`,
        [
          [pinAt(i), hidden(head(x))],
          ...move(pinAt(i), 0.5, hidden(head(x)), note, { lift: 10 }),
          ...move(2.0, 0.3, note, hidden(board)),
        ],
      ],
    ]),
  ),
  gift: [
    ...pop(2.25, board),
    ...move(3.1, 0.9, board, head(target), { lift: 34, tilt: 14 }),
    ...fade(6.0, head(target)),
  ],
  target: hop(4.1, ground(target)),
  // Off as the gift comes over the wall, and fully clear of the face before it fades, so it never shows as a see-through band.
  blindfold: [
    ...move(3.4, 0.2, origin, lifted),
    [3.7, { ...lifted, opacity: 0 }],
    [6.4, { ...lifted, opacity: 0 }],
    [6.45, lifted],
    ...move(6.45, 0.25, lifted, origin),
  ],
};

/**
 * Wordless loop of a Conspiracy Santa, above the explanation in the kind's (?) popover. Three
 * people pin ideas on a board behind a wall, turn them into one gift and send it over to the
 * blindfolded fourth, who never saw the board. Reduced motion: the gift handed over.
 */
export const ConspiracyAnimation = ({ playing, className }: { playing?: boolean; className?: string }) => {
  const scope = useLoop(tracks, LOOP, 5.5, playing);
  return (
    <Stage ref={scope} className={className}>
      <g transform={`translate(${board.x} ${board.y})`}>
        <Card width={104} height={36} />
      </g>
      {helpers.map(({ fill }, i) => (
        <g key={i} data-part={`note-${i}`}>
          <rect x={-6} y={-4} width={16} height={12} className="fill-outline" />
          <rect x={-8} y={-6} width={16} height={12} className={fill} />
        </g>
      ))}
      {helpers.map(({ fill }, i) => (
        <g key={i} data-part={`helper-${i}`}>
          <Person fill={fill} />
        </g>
      ))}
      <rect x={WALL.x} y={WALL.top} width={10} height={112 - WALL.top + 2} className="fill-primary" />
      <path
        d={Array.from({ length: 7 }, (_, row) => `M${WALL.x} ${WALL.top + 10 * (row + 1)}h10`).join('')}
        strokeWidth={1.5}
      />
      <g data-part="target">
        <Person fill="fill-coral">
          <rect data-part="blindfold" x={-14} y={-5} width={28} height={6} className="fill-outline" />
        </Person>
      </g>
      <g data-part="gift">
        <Gift />
      </g>
    </Stage>
  );
};
