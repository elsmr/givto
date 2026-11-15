import { boardScores, guessResults, type Boards } from '../../guess-results';
import { isFromGiftDay, type Edition } from '../../schema/edition';
import type { Group } from '../../schema/group';
import { swapState, type SwapState } from '../../swap-turns';
import { santaStillHidden, unwrapState, type GiftCounts } from '../../unwrap-turns';
import type { Collections } from '../db';
import { playerIds } from '../draw/rules';
import { giftCounts } from '../gift/marks';
import { guessesOf, guessingOn, santaShownIds, santaStepOn } from '../guess/guesses';

/**
 * The big reveal (31), when it's on: out once the presenter revealed it on gift day, or when gift
 * day is over, for groups that never opened the presenter.
 */
export const isRevealed = (edition: Edition) =>
  edition.reveal.enabled && ((Boolean(edition.reveal.revealedAt) && isFromGiftDay(edition)) || edition.status === 'done');

/**
 * Back to shopping (64) only while nothing is out: nobody unwrapped, no Santa shown at a turn (62), the big reveal never
 * out, also when switched off since.
 */
export const giftDayUnderway = (edition: Edition) => {
  const progress = edition.unwrapOrder?.progress;
  return (progress?.turns.length ?? 0) > 0 || (progress?.moves?.length ?? 0) > 0 || santaShownIds(edition).length > 0 || Boolean(edition.reveal.revealedAt);
};

/** The stored unwrap order (32) of who's in: people who left drop out; late joiners go last, so everyone still sees the same order. */
export const unwrapPeople = (stored: string[], inDraw: string[]) => [
  ...stored.filter((id) => inDraw.includes(id)),
  ...inDraw.filter((id) => !stored.includes(id)),
];

/**
 * The stored unwrap order and where the unwrapping is (32). Who drew whom (`pairs`) only once revealed.
 * `counts`: gifts per person from what the Santas marked (63), from gift day on.
 * Guess your Santa (62): `guessing` holds only the results that are out (the presenter showed that
 * person's Santa at their turn, or the big reveal is out); null when it's off. Each result's `tally` (94): how many
 * guessed each name for that giftee, most first, never who. Its `leaderboard` (82): points per board for the pairs that
 * are out, most first; empty until something is out.
 */
const giftDayState = (group: Group, edition: Edition, counts: GiftCounts, boards: Boards) => {
  const nameOf = (memberId: string) => group.members.find((m) => m.id === memberId)?.name ?? '?';
  const assignments = edition.draw?.assignments ?? {};
  const inDraw = playerIds(group, edition);
  const order = edition.unwrapOrder ? unwrapPeople(edition.unwrapOrder.memberIds, inDraw) : null;
  const santaOf = new Map(Object.entries(assignments).map(([santa, giftee]) => [giftee, santa]));
  const mode = edition.unwrapMode ?? 'allAtOnce';
  const progress = edition.unwrapOrder?.progress;
  const swap = edition.kind === 'whiteElephant' && order ? swapState(order, Boolean(progress), progress?.moves ?? []) : null;
  const state = swap ?? (order && unwrapState(order, mode, Boolean(progress), progress?.turns ?? [], counts));
  // Someone who left but stays in the draw (gift day had started) keeps their pairs, marked as left (105).
  const left = (memberId: string) => memberId in assignments && !inDraw.includes(memberId);
  const pairs = isRevealed(edition)
    ? [...(order ?? inDraw), ...Object.values(assignments).filter(left)].map((giftee) => {
        const santa = santaOf.get(giftee) ?? '';
        return { giftee: nameOf(giftee), santa: nameOf(santa), ...(left(giftee) && { gifteeLeft: true }), ...(left(santa) && { santaLeft: true }) };
      })
    : null;
  const revealedIds = isRevealed(edition) ? (order ?? inDraw) : santaStepOn(edition) ? santaShownIds(edition) : [];
  const guesses = Object.fromEntries(Object.entries(boards).map(([guesser, board]) => [guesser, board[guesser]]));
  const leaderboard = boardScores(revealedIds, assignments, boards)
    .map(({ memberId, points }) => ({ memberId, name: nameOf(memberId), points }))
    .toSorted((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  const guessing = guessingOn(edition)
    ? guessResults(revealedIds, assignments, guesses).map(({ memberId, santaMemberId, guessedMemberId, right }) => ({
        memberId,
        giftee: nameOf(memberId),
        santa: nameOf(santaMemberId),
        guess: guessedMemberId && nameOf(guessedMemberId),
        right,
        tally: Object.entries(Object.groupBy(Object.values(boards).flatMap((board) => board[memberId] ?? []), (santa) => santa))
          .map(([santa, of]) => ({ memberId: santa, name: nameOf(santa), count: of!.length }))
          .toSorted((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
      }))
    : null;
  const santaToShow = Boolean(state && progress?.currentShown && santaStepOn(edition) && santaStillHidden(state, progress.santaShownIds ?? []));
  return {
    nameOf, inDraw, order, mode, progress, state, swap, revealEnabled: edition.reveal.enabled, revealed: isRevealed(edition), pairs, underway: giftDayUnderway(edition),
    guessing: guessing && { results: guessing, right: guessing.filter((result) => result.right).length, leaderboard },
    santaToShow,
  };
};

/** White elephant (89): who holds which gift, how often it was stolen; `robbed` / `final`: why the current person is up. */
const swapTable = ({ gifts, wrapped, robbed, final }: SwapState, nameOf: (memberId: string) => string) => ({
  gifts: gifts.map(({ no, label, holderId, steals, frozen }) => ({ no, label, holder: { memberId: holderId, name: nameOf(holderId) }, steals, frozen })),
  wrapped,
  robbed,
  final,
});

/**
 * The presenter view (organizer): the whole unwrap order with each person's gift count (null: their
 * Santa marked nothing), whose turn it is and who's up next, and the reveal pairs in unwrap order. Once done, the
 * pairs and the guessing only when `viewerId` was in the draw, like the member view.
 */
export const presenterGiftDayView = (group: Group, edition: Edition, counts: GiftCounts, boards: Boards, viewerId: string) => {
  const { nameOf, inDraw, order, mode, progress, state, swap, revealEnabled, revealed, pairs, guessing, santaToShow } = giftDayState(group, edition, counts, boards);
  const shown = edition.status !== 'done' || inDraw.includes(viewerId);
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
            /** For `giftday.advance`: the turns (or swap moves) this view is based on. */
            turnsTaken: (swap ? progress?.moves?.length : progress?.turns.length) ?? 0,
            current: person(state.current),
            next: person(state.next),
            round: state.round,
            turn: state.turn,
            /** "Gift 2 of 3": which of their gifts the current person opens. */
            currentGift: state.currentGift,
            finished: state.finished,
          }
        : null,
    swap: swap && { ...swapTable(swap, nameOf), stealable: swap.stealable },
    reveal: { enabled: revealEnabled, revealed, pairs: shown ? pairs : null },
    guessing: shown ? guessing : null,
  };
};

/**
 * Gift day on the group home, for every member (31, 32): the unwrap order stays a surprise
 * (owner), so only who already went (in turn order) and who's unwrapping now, once the
 * presenter's reel landed on them. Reveal pairs by giftee name, not in unwrap order. The pairs and the guessing only
 * when `viewerId` is in the draw, like a done edition's wishlists (100).
 */
export const giftDayView = (group: Group, edition: Edition, counts: GiftCounts, boards: Boards) => {
  const { nameOf, inDraw, order, mode, progress, state, swap, revealEnabled, revealed, pairs, guessing, underway } = giftDayState(group, edition, counts, boards);
  const wentIds = [...new Set(progress?.turns.map((turn) => turn.memberId) ?? [])];
  const byGiftee = <T extends { giftee: string }>(list: T[]) => list.toSorted((a, b) => a.giftee.localeCompare(b.giftee));
  const unwrapOrder =
    order && state
      ? {
          shuffledAt: edition.unwrapOrder!.shuffledAt,
          went: wentIds.map((memberId) => ({ memberId, name: nameOf(memberId), done: state.doneIds.includes(memberId) })),
          started: Boolean(progress),
          current: state.current && progress?.currentShown ? { memberId: state.current, name: nameOf(state.current) } : null,
          turn: state.turn,
          finished: state.finished,
        }
      : null;
  const pairsByGiftee = pairs && byGiftee(pairs);
  const swapView = swap && swapTable(swap, nameOf);
  // In turn order while unwrapping; by giftee once the big reveal is out, like the pairs.
  const guessingInOrder = guessing && { ...guessing, results: revealed ? byGiftee(guessing.results) : guessing.results };
  return (viewerId: string) => {
    const inIt = inDraw.includes(viewerId);
    return {
      unwrapMode: mode,
      unwrapOrder,
      swap: swapView,
      reveal: { enabled: revealEnabled, revealed, pairs: inIt ? pairsByGiftee : null },
      guessing: inIt ? guessingInOrder : null,
      underway,
    };
  };
};

/** giftday.get, also pushed by the gift day stream (97): each member's view, from one read of the gifts and guesses. */
export const memberViews = async (db: Collections, group: Group, edition: Edition) => {
  const [counts, boards] = await Promise.all([giftCounts(db, edition), guessesOf(db, edition)]);
  return giftDayView(group, edition, counts, boards);
};
