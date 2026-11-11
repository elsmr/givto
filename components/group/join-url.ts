/** The shareable link. No language in it: the join page picks one, the group's for chat previews. */
export const joinUrl = (slug: string, token: string) =>
  `${window.location.origin}/g/${slug}/join?token=${encodeURIComponent(token)}`;

/** Following the presenter on your phone (95). */
export const liveUrl = (slug: string) => `${window.location.origin}/g/${slug}/live`;
