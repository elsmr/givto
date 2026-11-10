/** A ring filled to `value / max` with the count inside, e.g. "2/3" people needed for the draw. Decorative. */
export const RingGauge = ({ value, max }: { value: number; max: number }) => {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.min(value / max, 1) * circumference;
  return (
    <span aria-hidden="true" className="relative grid size-14 shrink-0 place-items-center">
      <svg viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90">
        <circle cx="24" cy="24" r={radius} fill="none" strokeWidth="6" className="stroke-primary-muted" />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeDasharray={`${filled} ${circumference}`}
          className={value >= max ? 'stroke-mint' : 'stroke-primary'}
        />
      </svg>
      <span className="text-sm font-bold tabular-nums">
        {value}/{max}
      </span>
    </span>
  );
};
