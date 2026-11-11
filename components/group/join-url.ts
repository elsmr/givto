/** The shareable link. No language in it: the join page picks one, the group's for chat previews. */
export const joinUrl = (slug: string, token: string) =>
  `${window.location.origin}/g/${slug}/join?token=${encodeURIComponent(token)}`;
