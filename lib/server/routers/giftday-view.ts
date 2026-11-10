import type { Edition } from '../../schema/edition';
import type { Group } from '../../schema/group';
import { unwrapState, type GiftCounts } from '../../unwrap-turns';

/** The big reveal (31) is out once the organizer turned it on and revealed it, from gift day on. */
export const isRevealed = (edition: Edition) =>
  edition.reveal.enabled &&
  Boolean(edition.reveal.revealedAt) &&
  (edition.status === 'giftday' || edition.status === 'done');

/**
 * The stored unwrap order and where the unwrapping is (32). Who drew whom (`pairs`) only once revealed.
 * `counts`: gifts per person from what the Santas marked (63), from gift day on.
 */
const giftDayState = (group: Group, edition: Edition, counts: GiftCounts) => {
  const nameOf = (memberId: string) => group.members.find((m) => m.id === memberId)?.name ?? '?';
  const assignments = edition.draw?.assignments ?? {};
  const inDraw = Object.keys(assignments);
  const stored = edition.unwrapOrder?.memberIds ?? [];
  // People who left drop out; late joiners go last, so everyone still sees the same order.
  const order = edition.unwrapOrder
    ? [...stored.filter((id) => inDraw.includes(id)), ...inDraw.filter((id) => !stored.includes(id))]
    : null;
  const santaOf = new Map(Object.entries(assignments).map(([santa, giftee]) => [giftee, santa]));
  const mode = edition.unwrapMode ?? 'allAtOnce';
  const progress = edition.unwrapOrder?.progress;
  const state = order && unwrapState(order, mode, Boolean(progress), progress?.turns ?? [], counts);
  const pairs = isRevealed(edition)
    ? (order ?? inDraw).map((giftee) => ({ giftee: nameOf(giftee), santa: nameOf(santaOf.get(giftee) ?? '') }))
    : null;
  return { nameOf, order, mode, progress, state, revealEnabled: edition.reveal.enabled, revealed: isRevealed(edition), pairs };
};

/**
 * The presenter view (organizer): the whole unwrap order with each person's gift count (null: their
 * Santa marked nothing), whose turn it is and who's up next, and the reveal pairs in unwrap order.
 */
export const presenterGiftDayView = (group: Group, edition: Edition, counts: GiftCounts) => {
  const { nameOf, order, mode, progress, state, revealEnabled, revealed, pairs } = giftDayState(group, edition, counts);
  const person = (memberId: string | null) => (memberId ? { memberId, name: nameOf(memberId) } : null);
  return {
    unwrapMode: mode,
    unwrapOrder:
      order && state
        ? {
            shuffledAt: edition.unwrapOrder!.shuffledAt,
            people: order.map((memberId) => ({ memberId, name: nameOf(memberId), done: state.doneIds.includes(memberId), gifts: counts[memberId] ?? null })),
            started: Boolean(progress),
            currentShown: Boolean(progress?.currentShown),
            /** For `giftday.advance`: the turns this view is based on. */
            turnsTaken: progress?.turns.length ?? 0,
            current: person(state.current),
            next: person(state.next),
            round: state.round,
            turn: state.turn,
            /** "Gift 2 of 3": which of their gifts the current person opens. */
            currentGift: state.currentGift,
            finished: state.finished,
          }
        : null,
    reveal: { enabled: revealEnabled, revealed, pairs },
  };
};

/**
 * Gift day on the group home, for every member (31, 32): the unwrap order stays a surprise
 * (owner), so only who already went (in turn order) and who's unwrapping now, once the
 * presenter's reel landed on them. Reveal pairs by giftee name, not in unwrap order.
 */
export const giftDayView = (group: Group, edition: Edition, counts: GiftCounts) => {
  const { nameOf, order, mode, progress, state, revealEnabled, revealed, pairs } = giftDayState(group, edition, counts);
  const wentIds = [...new Set(progress?.turns.map((turn) => turn.memberId) ?? [])];
  return {
    unwrapMode: mode,
    unwrapOrder:
      order && state
        ? {
            shuffledAt: edition.unwrapOrder!.shuffledAt,
            went: wentIds.map((memberId) => ({ memberId, name: nameOf(memberId), done: state.doneIds.includes(memberId) })),
            started: Boolean(progress),
            current: state.current && progress?.currentShown ? { memberId: state.current, name: nameOf(state.current) } : null,
            turn: state.turn,
            finished: state.finished,
          }
        : null,
    reveal: { enabled: revealEnabled, revealed, pairs: pairs?.toSorted((a, b) => a.giftee.localeCompare(b.giftee)) ?? null },
  };
};
