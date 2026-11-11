/** One name per line or comma separated; blanks dropped, each name once. */
export const parseNames = (text: string) => [
  ...new Set(
    text
      .split(/[\n,]/)
      .map((name) => name.trim())
      .filter(Boolean),
  ),
];

const RANGE = 2 ** 32;

/** 0 ≤ i < n, uniform: values in the incomplete last block of n are redrawn, so no modulo bias. */
export const randomIndex = (n: number): number => {
  const [value] = crypto.getRandomValues(new Uint32Array(1));
  return value < RANGE - (RANGE % n) ? value % n : randomIndex(n);
};

/** `count` different names from `pool`, in the order they were drawn. */
export const pickNames = (pool: string[], count: number): string[] => {
  if (count <= 0 || pool.length === 0) return [];
  const name = pool[randomIndex(pool.length)];
  return [name, ...pickNames(pool.filter((other) => other !== name), count - 1)];
};
