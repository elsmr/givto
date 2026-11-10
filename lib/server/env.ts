/** Read lazily (at first use, not import) so `next build` works without runtime secrets. */
export const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
};
