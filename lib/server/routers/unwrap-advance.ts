import * as v from 'valibot';
import type { Edition } from '../../schema/edition';
import type { Group } from '../../schema/group';
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
 * back: undo the last step.
 * `turnsTaken` is what the presenter saw, so a double tap or a second device can't skip anyone.
 */
export const AdvanceInput = v.object({
  action: v.picklist(['start', 'spin', 'vote', 'tally', 'santa', 'more', 'last', 'back']),
  turnsTaken: v.pipe(v.number(), v.integer(), v.minValue(0)),
});
type Advance = v.InferOutput<typeof AdvanceInput>;

/** The presenter's next step in the unwrapping (32), stored on the edition. Returns the updated edition. */
export const advanceUnwrapping = async (db: Collections, group: Group, edition: Edition, { action, turnsTaken }: Advance) => {
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
