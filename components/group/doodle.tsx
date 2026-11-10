import { cn } from '@/lib/utils';

const shapes = {
  starburst: <path d="M24 2l5 14 14-5-9 12 13 8-15 1 2 15-10-11-10 11 2-15-15-1 13-8-9-12 14 5z" />,
  ring: (
    <>
      <circle cx="24" cy="24" r="20" />
      <circle cx="24" cy="24" r="11" />
    </>
  ),
  dots: [8, 20, 32].flatMap((y) => [8, 20, 32].map((x) => <circle key={`${x}-${y}`} cx={x + 4} cy={y + 4} r="2.5" />)),
};

/** Playful outlined shape for empty states and card corners (61). Purely decorative. */
export const Doodle = ({ shape, className }: { shape: keyof typeof shapes; className?: string }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 48 48"
    fill={shape === 'dots' ? 'currentColor' : 'none'}
    stroke={shape === 'dots' ? 'none' : 'currentColor'}
    strokeWidth="2.5"
    strokeLinejoin="round"
    className={cn('pointer-events-none size-12 shrink-0', className)}
  >
    {shapes[shape]}
  </svg>
);
