import type { Edition } from '../../schema/edition';
import type { Group } from '../../schema/group';
import { unwrapState } from '../../unwrap-turns';

/** The big reveal (31) is out once the organizer turned it on and revealed it, from gift day on. */
export const isRevealed = (edition: Edition) =>
  edition.reveal.enabled &&
  Boolean(edition.reveal.revealedAt) &&
  (edition.status === 'giftday' || edition.status === 'done');

/**
 * Gift day for every member (31, 32): the unwrap order and progress, and the reveal state. Who
 * drew whom (`pairs`) only once revealed; before that the output has no Santa at all. Whose turn
 * it is only once the presenter's reel landed on them, except for the presenter itself (`presenter`).
 */
export const giftDayView = (group: Group, edition: Edition, { presenter = false } = {}) => {
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
  const mode = edition.unwrapMode ?? 'allAtOnce';
  const progress = edition.unwrapOrder?.progress;
  const state = order && unwrapState(order, mode, Boolean(progress), progress?.turns ?? []);
  const shown = presenter || Boolean(progress?.currentShown);
  const person = (memberId: string | null) => (memberId && shown ? { memberId, name: nameOf(memberId) } : null);
  return {
    unwrapMode: mode,
    unwrapOrder:
      order && state
        ? {
            shuffledAt: edition.unwrapOrder!.shuffledAt,
            people: order.map((memberId) => ({ memberId, name: nameOf(memberId), done: state.doneIds.includes(memberId) })),
            started: Boolean(progress),
            currentShown: Boolean(progress?.currentShown),
            /** For `giftday.advance`: the turns this view is based on. */
            turnsTaken: progress?.turns.length ?? 0,
            current: person(state.current),
            next: person(state.next),
            round: state.round,
            turn: state.turn,
            finished: state.finished,
          }
        : null,
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
