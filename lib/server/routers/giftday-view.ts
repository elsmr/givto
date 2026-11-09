import type { Edition } from '../../schema/edition';
import type { Group } from '../../schema/group';

/** The big reveal (31) is out once the organizer turned it on and revealed it, from gift day on. */
export const isRevealed = (edition: Edition) =>
  edition.reveal.enabled &&
  Boolean(edition.reveal.revealedAt) &&
  (edition.status === 'giftday' || edition.status === 'done');

/**
 * Gift day for every member (31, 32): the unwrap order and the reveal state. Who drew whom
 * (`pairs`) only once revealed; before that the output has no Santa at all.
 */
export const giftDayView = (group: Group, edition: Edition) => {
  const nameOf = (memberId: string) => group.members.find((m) => m.id === memberId)?.name ?? '?';
  const assignments = edition.draw?.assignments ?? {};
  const inDraw = Object.keys(assignments);
  const stored = edition.unwrapOrder?.memberIds ?? [];
  // People who left drop out; late joiners go last, so everyone still sees the same order.
  const order = edition.unwrapOrder
    ? [...stored.filter((id) => inDraw.includes(id)), ...inDraw.filter((id) => !stored.includes(id))]
    : null;
  const giftees = order ?? inDraw;
  const santaOf = new Map(Object.entries(assignments).map(([santa, giftee]) => [giftee, santa]));
  return {
    unwrapOrder: order && {
      shuffledAt: edition.unwrapOrder!.shuffledAt,
      people: order.map((memberId) => ({ memberId, name: nameOf(memberId) })),
    },
    reveal: {
      enabled: edition.reveal.enabled,
      revealed: isRevealed(edition),
      /** In unwrap order: "<giftee> got theirs from <santa>". */
      pairs: isRevealed(edition)
        ? giftees.map((giftee) => ({ giftee: nameOf(giftee), santa: nameOf(santaOf.get(giftee) ?? '') }))
        : null,
    },
  };
};
