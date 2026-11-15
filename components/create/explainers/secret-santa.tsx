import { Card, fade, Gift, ground, head, hidden, hop, move, Person, type Pose, pop, Stage, type Track, useLoop } from './parts';

const LOOP = 8;
const people = [
  { x: 28, fill: 'fill-primary' },
  { x: 92, fill: 'fill-yellow' },
  { x: 156, fill: 'fill-mint' },
  { x: 220, fill: 'fill-coral' },
];
// Who each person draws: nobody draws themselves.
const draws = [2, 0, 3, 1];
const hat: Pose = { x: 124, y: 34 };
const outOfHat: Pose = { x: hat.x, y: 10 };
const drawAt = (i: number) => 0.3 + 0.5 * i;
const flyAt = (giver: number) => 3.3 + 0.25 * giver;
const landsAt = (giver: number) => flyAt(giver) + 0.8;
const wonder = (x: number): Pose => ({ x: x + 22, y: 58 });

const tracks: Record<string, Track> = Object.fromEntries<Track>([
  [
    'hat',
    people.flatMap((_, i): Track => {
      const t = drawAt(i);
      return [[t, hat], [t + 0.08, { ...hat, rotate: -8 }], [t + 0.18, { ...hat, rotate: 6 }], [t + 0.28, hat]];
    }),
  ],
  ...people.flatMap(({ x }, i): [string, Track][] => {
    const draw = drawAt(i);
    const receiver = draws[i];
    const giver = draws.indexOf(i);
    const to = people[receiver].x;
    return [
      [`person-${i}`, [...hop(draw + 0.62, ground(x)), ...hop(landsAt(giver), ground(x))]],
      [
        `slip-${i}`,
        [
          [draw, hidden({ x: hat.x, y: 24 })],
          [draw + 0.12, outOfHat],
          ...move(draw + 0.12, 0.5, outOfHat, head(x), { lift: 10, tilt: 12 * Math.sign(x - hat.x) }),
          ...fade(2.7, head(x)),
        ],
      ],
      [
        `gift-${i}`,
        [
          ...pop(2.8, head(x)),
          ...move(flyAt(i), 0.8, head(x), head(to), { lift: 18, tilt: 14 * Math.sign(to - x) }),
          ...fade(7, head(to)),
        ],
      ],
      [`wonder-${i}`, [...pop(landsAt(giver) + 0.1, wonder(x)), ...fade(7, wonder(x))]],
    ];
  }),
]);

/**
 * Wordless loop of a Secret Santa, above the explanation in the kind's (?) popover. Four people each
 * draw a slip from the hat naming someone else (the slip shows their colour), the slips become gifts
 * that land with their person, and each wonders who sent theirs. Reduced motion: that end frame.
 */
export const SecretSantaAnimation = ({ playing, className }: { playing?: boolean; className?: string }) => {
  const scope = useLoop(tracks, LOOP, 6.6, playing);
  return (
    <Stage ref={scope} className={className}>
      <g data-part="hat">
        <rect x={-11} y={-22} width={22} height={18} className="fill-outline" />
        <rect x={-11} y={-9} width={22} height={4} className="fill-coral" />
        <rect x={-19} y={-6} width={38} height={6} className="fill-outline" />
      </g>
      {people.map(({ fill }, i) => (
        <g key={i} data-part={`person-${i}`}>
          <Person fill={fill} />
        </g>
      ))}
      {people.map((_, i) => (
        <g key={i} data-part={`wonder-${i}`}>
          <Card width={16} height={16}>
            <text y={5} textAnchor="middle" stroke="none" className="fill-outline font-heading text-[13px] font-bold">
              ?
            </text>
          </Card>
        </g>
      ))}
      {people.map((_, i) => (
        <g key={i} data-part={`slip-${i}`}>
          <Card width={22} height={14}>
            <rect x={-4.5} y={-4.5} width={9} height={9} strokeWidth={1.5} className={people[draws[i]].fill} />
          </Card>
        </g>
      ))}
      {people.map((_, i) => (
        <g key={i} data-part={`gift-${i}`}>
          <Gift />
        </g>
      ))}
    </Stage>
  );
};
