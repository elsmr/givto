import * as v from 'valibot';
import { SingleLine } from '../../schema/common';
import type { Edition, SwapMove } from '../../schema/edition';
import type { Group } from '../../schema/group';
import { canMove, swapState } from '../../swap-turns';
import { backHidesSanta, isLastGift, santaStillHidden, unwrapState } from '../../unwrap-turns';
import type { Collections } from '../db';
import { playerIds } from '../draw/rules';
import { AppError } from '../errors';
import { giftCounts } from '../gift/marks';
import { santaStepOn } from '../guess/guesses';
import { unwrapPeople } from './giftday-view';

/**
 * start: past the intro. spin: the reel landed on whose turn it is. santa: Guess your Santa (62),
 * show who their Santa was (with their guess and everyone's tally) once they've unwrapped. more / last: their turn is
 * over, with gifts left or not (allAtOnce: always "last"; a known gift count (63) decides by itself).
 * White elephant (89) instead of more / last: open (a wrapped gift, `label` optional), steal (`giftNo`), keep (theirs, at the
 * final steal). back: undo the last step.
 * `turnsTaken` is what the presenter saw (turns, or swap moves), so a double tap or a second device can't skip anyone.
 */
export const AdvanceInput = v.object({
  action: v.picklist(['start', 'spin', 'santa', 'more', 'last', 'open', 'steal', 'keep', 'back']),
  turnsTaken: v.pipe(v.number(), v.integer(), v.minValue(0)),
  giftNo: v.optional(v.pipe(v.number(), v.integer(), v.minValue(1))),
  label: v.optional(SingleLine(60)),
});
type Advance = v.InferOutput<typeof AdvanceInput>;

const swapActions: Advance['action'][] = ['start', 'spin', 'open', 'steal', 'keep', 'back'];

/** The order's people and progress, once sure the presenter saw the latest step (`steps`: turns, or swap moves). */
const checkedOrder = (group: Group, edition: Edition, { action, turnsTaken }: Advance, steps: 'turns' | 'moves') => {
  const order = edition.unwrapOrder;
  if (!order) throw new AppError('NOT_DRAWN');
  const { progress } = order;
  if ((progress?.[steps]?.length ?? 0) !== turnsTaken || (action === 'start') === Boolean(progress)) throw new AppError('EDITION_CHANGED');
  return { people: unwrapPeople(order.memberIds, playerIds(group, edition)), progress };
};

/** Saves the step unless another one landed first (`seen`: the steps the presenter saw). */
const saveStep = async (db: Collections, edition: Edition, action: Advance['action'], seen: object, update: object) => {
  const saved = await db.editions.findOneAndUpdate(
    { _id: edition._id, 'unwrapOrder.shuffledAt': edition.unwrapOrder!.shuffledAt, ...(action === 'start' ? { 'unwrapOrder.progress': { $exists: false } } : seen) },
    update,
    { returnDocument: 'after' }
  );
  if (!saved) throw new AppError('EDITION_CHANGED');
  return saved;
};

/** A white elephant swap's next step (89): the moves replace the turns, no Santas. */
const advanceSwap = async (db: Collections, group: Group, edition: Edition, input: Advance) => {
  const { action, turnsTaken, giftNo, label } = input;
  if (!swapActions.includes(action)) throw new AppError('FORBIDDEN');
  const { people, progress } = checkedOrder(group, edition, input, 'moves');
  const moves = progress?.moves ?? [];
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
  const seen = {
    'unwrapOrder.progress': { $exists: true },
    // A swap started before moves existed (88) has none yet.
    $or: [{ 'unwrapOrder.progress.moves': { $size: turnsTaken } }, ...(turnsTaken === 0 ? [{ 'unwrapOrder.progress.moves': { $exists: false } }] : [])],
  };
  return saveStep(db, edition, action, seen, update);
};

/** The presenter's next step in the unwrapping (32), stored on the edition. Returns the updated edition. */
export const advanceUnwrapping = async (db: Collections, group: Group, edition: Edition, input: Advance) => {
  if (edition.kind === 'whiteElephant') return advanceSwap(db, group, edition, input);
  const { action, turnsTaken } = input;
  if (action === 'open' || action === 'steal' || action === 'keep') throw new AppError('FORBIDDEN');
  const { people, progress } = checkedOrder(group, edition, input, 'turns');
  const counts = await giftCounts(db, edition);
  const turns = progress?.turns ?? [];
  const mode = edition.unwrapMode ?? 'allAtOnce';
  const state = unwrapState(people, mode, Boolean(progress), turns, counts);
  if (action !== 'start' && action !== 'spin' && action !== 'back' && !state.current) throw new AppError('EDITION_CHANGED');
  const santaShownIds = progress?.santaShownIds ?? [];
  // With guessing on, a turn only ends once their Santa was shown; showing it needs the turn on screen.
  const santaHidden = santaStepOn(edition) && santaStillHidden(state, santaShownIds);
  if ((action === 'more' || action === 'last') && santaHidden) throw new AppError('EDITION_CHANGED');
  if (action === 'santa' && (!santaHidden || !progress?.currentShown)) throw new AppError('EDITION_CHANGED');
  // One person left: there's nobody to spin between.
  const onlyOneLeft = (next: typeof turns) => unwrapState(people, mode, true, next, counts).next === null;
  const turn =
    action === 'more' || action === 'last'
      ? { memberId: state.current!, last: action === 'last' || isLastGift(mode, turns, state.current!, counts) }
      : null;

  const update: object = turn
    ? { $push: { 'unwrapOrder.progress.turns': turn }, $set: { 'unwrapOrder.progress.currentShown': onlyOneLeft([...turns, turn]) } }
    : action === 'start'
      ? { $set: { 'unwrapOrder.progress': { startedAt: new Date(), turns: [], currentShown: people.length <= 1 } } }
      : action === 'spin'
        ? { $set: { 'unwrapOrder.progress.currentShown': true } }
        : action === 'santa'
          ? { $addToSet: { 'unwrapOrder.progress.santaShownIds': state.current } }
          : backHidesSanta(state, turns, santaShownIds)
            ? { $pull: { 'unwrapOrder.progress.santaShownIds': state.current } }
            : turns.length === 0
              ? { $unset: { 'unwrapOrder.progress': true } }
              : { $pop: { 'unwrapOrder.progress.turns': 1 }, $set: { 'unwrapOrder.progress.currentShown': true } };
  return saveStep(db, edition, action, { 'unwrapOrder.progress.turns': { $size: turnsTaken } }, update);
};
