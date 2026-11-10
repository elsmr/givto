import { guessResults, type Guesses } from '../../guess-results';
import { isFromGiftDay, type Edition } from '../../schema/edition';
import type { Group } from '../../schema/group';
import { santaStillHidden, unwrapState, type GiftCounts } from '../../unwrap-turns';
import { guessingOn, santaStepOn } from '../guess/guesses';

/**
 * The big reveal (31), when it's on: out once the presenter revealed it on gift day, or when gift
 * day is over, for groups that never opened the presenter.
 */
export const isRevealed = (edition: Edition) =>
  edition.reveal.enabled && ((Boolean(edition.reveal.revealedAt) && isFromGiftDay(edition)) || edition.status === 'done');

/**
 * The stored unwrap order and where the unwrapping is (32). Who drew whom (`pairs`) only once revealed.
 * `counts`: gifts per person from what the Santas marked (63), from gift day on.
 * Guess your Santa (62): `guessing` holds only the results that are out (the presenter showed that
 * person's Santa at their turn, or the big reveal is out); null when it's off.
 */
const giftDayState = (group: Group, edition: Edition, counts: GiftCounts, guesses: Guesses) => {
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
  const santaShownIds = santaStepOn(edition) ? (progress?.santaShownIds ?? []) : [];
  const revealedIds = isRevealed(edition) ? (order ?? inDraw) : santaShownIds;
  const guessing = guessingOn(edition)
    ? guessResults(revealedIds, assignments, guesses).map(({ memberId, santaMemberId, guessedMemberId, right }) => ({
        memberId,
        giftee: nameOf(memberId),
        santa: nameOf(santaMemberId),
        guess: guessedMemberId && nameOf(guessedMemberId),
        right,
      }))
    : null;
  return {
    nameOf, order, mode, progress, state, revealEnabled: edition.reveal.enabled, revealed: isRevealed(edition), pairs,
    guessing: guessing && { results: guessing, right: guessing.filter((result) => result.right).length },
    santaToShow: Boolean(state && progress?.currentShown && santaStepOn(edition) && santaStillHidden(state, santaShownIds)),
  };
};

/**
 * The presenter view (organizer): the whole unwrap order with each person's gift count (null: their
 * Santa marked nothing), whose turn it is and who's up next, and the reveal pairs in unwrap order.
 */
export const presenterGiftDayView = (group: Group, edition: Edition, counts: GiftCounts, guesses: Guesses) => {
  const { nameOf, order, mode, progress, state, revealEnabled, revealed, pairs, guessing, santaToShow } = giftDayState(group, edition, counts, guesses);
  const person = (memberId: string | null) => (memberId ? { memberId, name: nameOf(memberId) } : null);
  return {
    unwrapMode: mode,
    unwrapOrder:
      order && state
        ? {
            shuffledAt: edition.unwrapOrder!.shuffledAt,
            people: order.map((memberId) => ({ memberId, name: nameOf(memberId), done: state.doneIds.includes(memberId), gifts: memberId in counts ? counts[memberId] : null })),
            started: Boolean(progress),
            currentShown: Boolean(progress?.currentShown),
            /** Guess your Santa (62): the current person has unwrapped; their Santa is next ("Who was it from?"). */
            santaToShow,
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
    guessing,
  };
};

/**
 * Gift day on the group home, for every member (31, 32): the unwrap order stays a surprise
 * (owner), so only who already went (in turn order) and who's unwrapping now, once the
 * presenter's reel landed on them. Reveal pairs by giftee name, not in unwrap order.
 */
export const giftDayView = (group: Group, edition: Edition, counts: GiftCounts, guesses: Guesses) => {
  const { nameOf, order, mode, progress, state, revealEnabled, revealed, pairs, guessing } = giftDayState(group, edition, counts, guesses);
  const wentIds = [...new Set(progress?.turns.map((turn) => turn.memberId) ?? [])];
  const byGiftee = <T extends { giftee: string }>(list: T[]) => list.toSorted((a, b) => a.giftee.localeCompare(b.giftee));
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
    reveal: { enabled: revealEnabled, revealed, pairs: pairs && byGiftee(pairs) },
    // In turn order while unwrapping; by giftee once the big reveal is out, like the pairs.
    guessing: guessing && { ...guessing, results: revealed ? byGiftee(guessing.results) : guessing.results },
  };
};
