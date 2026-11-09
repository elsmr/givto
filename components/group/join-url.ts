/** The shareable link. No locale prefix: each person gets their own language. */
export const joinUrl = (slug: string, token: string) =>
  `${window.location.origin}/g/${slug}/join?token=${encodeURIComponent(token)}`;
