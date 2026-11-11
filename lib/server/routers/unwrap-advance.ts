import * as v from 'valibot';
import { SingleLine } from '../../schema/common';
import type { Edition, SwapMove } from '../../schema/edition';
import type { Group } from '../../schema/group';
import { canMove, swapState } from '../../swap-turns';
import { backHidesSanta, isLastGift, santaStillHidden, unwrapState, voteStep } from '../../unwrap-turns';
import type { Collections } from '../db';
import { AppError } from '../errors';
import { giftCounts } from '../gift/marks';
import { santaStepOn } from '../guess/guesses';
import { presenterGiftDayView } from './giftday-view';

/**
 * start: past the intro. spin: the reel landed on whose turn it is. santa: Guess your Santa (62),
 * show who their Santa was (and their guess) once they've unwrapped. vote / tally: live voting (83)
 * before the Santa: open the vote on everyone's phone, then close it and show the tally. more / last: their turn is
 * over, with gifts left or not (allAtOnce: always "last"; a known gift count (63) decides by itself).
 * White elephant (89) instead of more / last: open (a wrapped gift, `label` optional), steal (`giftNo`), keep (theirs, at the
 * final steal). back: undo the last step.
 * `turnsTaken` is what the presenter saw (turns, or swap moves), so a double tap or a second device can't skip anyone.
 */
export const AdvanceInput = v.object({
  action: v.picklist(['start', 'spin', 'vote', 'tally', 'santa', 'more', 'last', 'open', 'steal', 'keep', 'back']),
  turnsTaken: v.pipe(v.number(), v.integer(), v.minValue(0)),
  giftNo: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  label: v.optional(SingleLine(60)),
});
type Advance = v.InferOutput<typeof AdvanceInput>;

const swapActions: Advance['action'][] = ['start', 'spin', 'open', 'steal', 'keep', 'back'];

/** A white elephant swap's next step (89): the moves replace the turns, no Santas or votes. */
const advanceSwap = async (db: Collections, group: Group, edition: Edition, { action, turnsTaken, giftNo, label }: Advance) => {
  const view = presenterGiftDayView(group, edition, {}, {}).unwrapOrder;
  const order = edition.unwrapOrder;
  if (!view || !order) throw new AppError('NOT_DRAWN');
  if (!swapActions.includes(action)) throw new AppError('FORBIDDEN');
  const progress = order.progress;
  const moves = progress?.moves ?? [];
  if (moves.length !== turnsTaken || (action !== 'start' && !progress) || (action === 'start' && progress)) {
    throw new AppError('EDITION_CHANGED');
  }
  const people = view.people.map((p) => p.memberId);
  const state = swapState(people, Boolean(progress), moves);
  if ((action === 'open' || action === 'steal' || action === 'keep') && !canMove(state, action, giftNo)) throw new AppError('FORBIDDEN');
  // Nobody to spin between: a steal hands the turn to the person robbed, the final steal is the first player's, and the
  // last one in the order needs no reel.
  const shown = (next: SwapMove[]) => {
    const after = swapState(people, true, next);
    return after.robbed || after.final || after.finished || people.length - after.doneIds.length <= 1;
  };
  const memberId = state.current!;
  const move: SwapMove | null =
    action === 'open'
      ? { memberId, action, giftNo: state.gifts.length + 1, ...(label && { label }) }
      : action === 'steal'
        ? { memberId, action, giftNo }
        : action === 'keep'
          ? { memberId, action }
          : null;

  const update: object = move
    ? { $push: { 'unwrapOrder.progress.moves': move }, $set: { 'unwrapOrder.progress.currentShown': shown([...moves, move]) } }
    : action === 'start'
      ? { $set: { 'unwrapOrder.progress': { startedAt: new Date(), turns: [], moves: [], currentShown: shown([]) } } }
      : action === 'spin'
        ? { $set: { 'unwrapOrder.progress.currentShown': true } }
        : moves.length === 0
          ? { $unset: { 'unwrapOrder.progress': true } }
          : { $pop: { 'unwrapOrder.progress.moves': 1 }, $set: { 'unwrapOrder.progress.currentShown': true } };
  const saved = await db.editions.findOneAndUpdate(
    action === 'start'
      ? { _id: edition._id, 'unwrapOrder.shuffledAt': order.shuffledAt, 'unwrapOrder.progress': { $exists: false } }
      : {
          _id: edition._id,
          'unwrapOrder.shuffledAt': order.shuffledAt,
          'unwrapOrder.progress': { $exists: true },
          // A swap started before moves existed (88) has none yet.
          $or: [{ 'unwrapOrder.progress.moves': { $size: turnsTaken } }, ...(turnsTaken === 0 ? [{ 'unwrapOrder.progress.moves': { $exists: false } }] : [])],
        },
    update,
    { returnDocument: 'after' }
  );
  if (!saved) throw new AppError('EDITION_CHANGED');
  return saved;
};

/** The presenter's next step in the unwrapping (32), stored on the edition. Returns the updated edition. */
export const advanceUnwrapping = async (db: Collections, group: Group, edition: Edition, input: Advance) => {
  if (edition.kind === 'whiteElephant') return advanceSwap(db, group, edition, input);
  const { action, turnsTaken } = input;
  if (action === 'open' || action === 'steal' || action === 'keep') throw new AppError('FORBIDDEN');
  const counts = await giftCounts(db, edition);
  const view = presenterGiftDayView(group, edition, counts, {}).unwrapOrder;
  const order = edition.unwrapOrder;
  if (!view || !order) throw new AppError('NOT_DRAWN');
  const progress = order.progress;
  const turns = progress?.turns ?? [];
  if (turns.length !== turnsTaken || (action !== 'start' && !progress) || (action === 'start' && progress)) {
    throw new AppError('EDITION_CHANGED');
  }
  if (action !== 'start' && action !== 'spin' && action !== 'back' && !view.current) throw new AppError('EDITION_CHANGED');
  const people = view.people.map((p) => p.memberId);
  const mode = edition.unwrapMode ?? 'allAtOnce';
  const state = unwrapState(people, mode, Boolean(progress), turns, counts);
  const santaShownIds = progress?.santaShownIds ?? [];
  // With guessing on, a turn only ends once their Santa was shown; showing it needs the turn on screen.
  const santaHidden = santaStepOn(edition) && santaStillHidden(state, santaShownIds);
  if ((action === 'more' || action === 'last') && santaHidden) throw new AppError('EDITION_CHANGED');
  const vote = santaHidden && progress?.currentShown ? voteStep(state, santaShownIds, progress.votedIds ?? [], progress.voteOpenFor) : null;
  // The vote opens, closes, then the Santa comes out: each needs the step before it.
  const needs = { vote: 'ready', tally: 'open', santa: 'closed' } as const;
  if ((action === 'vote' || action === 'tally' || action === 'santa') && vote !== needs[action]) throw new AppError('EDITION_CHANGED');
  const filter = {
    _id: edition._id,
    'unwrapOrder.shuffledAt': order.shuffledAt,
    'unwrapOrder.progress.turns': { $size: turnsTaken },
    ...(action === 'vote' && { 'unwrapOrder.progress.voteOpenFor': { $exists: false } }),
    ...(action === 'tally' && { 'unwrapOrder.progress.voteOpenFor': state.current }),
  };
  // One person left: there's nobody to spin between.
  const onlyOneLeft = (next: typeof turns) => unwrapState(people, mode, true, next, counts).next === null;

  let update: object;
  if (action === 'start') {
    update = { $set: { 'unwrapOrder.progress': { startedAt: new Date(), turns: [], currentShown: people.length <= 1 } } };
  } else if (action === 'spin') {
    update = { $set: { 'unwrapOrder.progress.currentShown': true } };
  } else if (action === 'vote') {
    // Votes left from an earlier run of this turn (start over, back to shopping) don't count; none come in while it's closed.
    await db.votes.deleteMany({ editionId: edition._id, turnMemberId: view.current!.memberId });
    update = { $set: { 'unwrapOrder.progress.voteOpenFor': view.current!.memberId } };
  } else if (action === 'tally') {
    update = { $unset: { 'unwrapOrder.progress.voteOpenFor': true }, $addToSet: { 'unwrapOrder.progress.votedIds': view.current!.memberId } };
  } else if (action === 'santa') {
    update = { $addToSet: { 'unwrapOrder.progress.santaShownIds': view.current!.memberId } };
  } else if (action === 'back') {
    update = backHidesSanta(state, turns, santaShownIds)
      ? { $pull: { 'unwrapOrder.progress.santaShownIds': state.current } }
      : vote === 'closed'
        ? { $pull: { 'unwrapOrder.progress.votedIds': state.current }, $set: { 'unwrapOrder.progress.voteOpenFor': state.current } }
        : vote === 'open'
          ? { $unset: { 'unwrapOrder.progress.voteOpenFor': true } }
          : turns.length === 0
            ? { $unset: { 'unwrapOrder.progress': true } }
            : { $pop: { 'unwrapOrder.progress.turns': 1 }, $set: { 'unwrapOrder.progress.currentShown': true } };
  } else {
    const memberId = view.current!.memberId;
    const turn = { memberId, last: action === 'last' || isLastGift(mode, turns, memberId, counts) };
    update = {
      $push: { 'unwrapOrder.progress.turns': turn },
      $set: { 'unwrapOrder.progress.currentShown': onlyOneLeft([...turns, turn]) },
    };
  }
  const saved = await db.editions.findOneAndUpdate(
    action === 'start' ? { _id: edition._id, 'unwrapOrder.shuffledAt': order.shuffledAt, 'unwrapOrder.progress': { $exists: false } } : filter,
    update,
    { returnDocument: 'after' }
  );
  if (!saved) throw new AppError('EDITION_CHANGED');
  return saved;
};
