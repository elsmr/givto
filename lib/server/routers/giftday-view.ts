import { boardScores, guessResults, type Boards } from '../../guess-results';
import { isFromGiftDay, type Edition } from '../../schema/edition';
import type { Group } from '../../schema/group';
import type { Vote } from '../../schema/vote';
import { swapState, type SwapState } from '../../swap-turns';
import { santaStillHidden, unwrapState, voteStep, type GiftCounts } from '../../unwrap-turns';
import { playerIds } from '../draw/rules';
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
 * person's Santa at their turn, or the big reveal is out); null when it's off. Its `leaderboard` (82):
 * points per board for the pairs that are out, most first; empty until something is out.
 * Live voting (83), with Guess your Santa on: `vote` for the current person once the presenter opened it; its
 * `tally` (votes per name, most first) only once closed. `votes`: the votes at the current person's turn.
 */
const giftDayState = (group: Group, edition: Edition, counts: GiftCounts, boards: Boards, votes: Vote[]) => {
  const nameOf = (memberId: string) => group.members.find((m) => m.id === memberId)?.name ?? '?';
  const assignments = edition.draw?.assignments ?? {};
  const inDraw = playerIds(group, edition);
  const stored = edition.unwrapOrder?.memberIds ?? [];
  // People who left drop out; late joiners go last, so everyone still sees the same order.
  const order = edition.unwrapOrder
    ? [...stored.filter((id) => inDraw.includes(id)), ...inDraw.filter((id) => !stored.includes(id))]
    : null;
  const santaOf = new Map(Object.entries(assignments).map(([santa, giftee]) => [giftee, santa]));
  const mode = edition.unwrapMode ?? 'allAtOnce';
  const progress = edition.unwrapOrder?.progress;
  const swap = edition.kind === 'whiteElephant' && order ? swapState(order, Boolean(progress), progress?.moves ?? []) : null;
  const state = swap ?? (order && unwrapState(order, mode, Boolean(progress), progress?.turns ?? [], counts));
  const pairs = isRevealed(edition)
    ? (order ?? inDraw).map((giftee) => ({ giftee: nameOf(giftee), santa: nameOf(santaOf.get(giftee) ?? '') }))
    : null;
  const santaShownIds = santaStepOn(edition) ? (progress?.santaShownIds ?? []) : [];
  const revealedIds = isRevealed(edition) ? (order ?? inDraw) : santaShownIds;
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
      }))
    : null;
  const santaToShow = Boolean(state && progress?.currentShown && santaStepOn(edition) && santaStillHidden(state, santaShownIds));
  const current = progress?.currentShown && santaStepOn(edition) ? (state?.current ?? null) : null;
  const open = Boolean(current) && progress?.voteOpenFor === current;
  const closed = Boolean(current && progress?.votedIds?.includes(current));
  const tally = Object.entries(Object.groupBy(votes.filter((vote) => vote.turnMemberId === current), (vote) => vote.votedMemberId))
    .map(([memberId, of]) => ({ memberId, name: nameOf(memberId), votes: of!.length }))
    .toSorted((a, b) => b.votes - a.votes || a.name.localeCompare(b.name));
  return {
    nameOf, order, mode, progress, state, swap, revealEnabled: edition.reveal.enabled, revealed: isRevealed(edition), pairs, inDraw,
    guessing: guessing && { results: guessing, right: guessing.filter((result) => result.right).length, leaderboard },
    santaToShow,
    voteStep: santaToShow && state ? voteStep(state, santaShownIds, progress?.votedIds ?? [], progress?.voteOpenFor) : null,
    vote: current && (open || closed) ? { memberId: current, name: nameOf(current), open, tally: closed ? tally : null } : null,
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
 * Santa marked nothing), whose turn it is and who's up next, and the reveal pairs in unwrap order.
 */
export const presenterGiftDayView = (group: Group, edition: Edition, counts: GiftCounts, boards: Boards, votes: Vote[] = []) => {
  const { nameOf, order, mode, progress, state, swap, revealEnabled, revealed, pairs, guessing, santaToShow, voteStep, vote } =
    giftDayState(group, edition, counts, boards, votes);
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
            /** Live voting (83) while `santaToShow`: the vote is ready to open, open, or closed (then the Santa). */
            voteStep,
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
    reveal: { enabled: revealEnabled, revealed, pairs },
    guessing,
    vote,
  };
};

/**
 * Gift day on the group home, for every member (31, 32): the unwrap order stays a surprise
 * (owner), so only who already went (in turn order) and who's unwrapping now, once the
 * presenter's reel landed on them. Reveal pairs by giftee name, not in unwrap order.
 * The vote (83) adds what `viewerId` may vote for while it's open (anyone in the draw but themselves and
 * the person unwrapping; nothing for the person unwrapping or anyone outside the draw) and their own vote.
 */
export const giftDayView = (group: Group, edition: Edition, counts: GiftCounts, boards: Boards, votes: Vote[] = [], viewerId?: string) => {
  const { nameOf, order, mode, progress, state, swap, revealEnabled, revealed, pairs, guessing, vote, inDraw } = giftDayState(group, edition, counts, boards, votes);
  const canVote = vote?.open && viewerId && inDraw.includes(viewerId) && viewerId !== vote.memberId;
  const mine = votes.find((v) => v.turnMemberId === vote?.memberId && v.voterMemberId === viewerId)?.votedMemberId;
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
    swap: swap && swapTable(swap, nameOf),
    reveal: { enabled: revealEnabled, revealed, pairs: pairs && byGiftee(pairs) },
    // In turn order while unwrapping; by giftee once the big reveal is out, like the pairs.
    guessing: guessing && { ...guessing, results: revealed ? byGiftee(guessing.results) : guessing.results },
    vote: vote && {
      ...vote,
      people: canVote
        ? inDraw
            .filter((id) => id !== viewerId && id !== vote.memberId)
            .map((memberId) => ({ memberId, name: nameOf(memberId) }))
            .toSorted((a, b) => a.name.localeCompare(b.name))
        : [],
      mine: mine ? { memberId: mine, name: nameOf(mine) } : null,
    },
  };
};
