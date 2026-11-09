import * as v from 'valibot';
import type { Edition } from '../../schema/edition';
import type { Group } from '../../schema/group';
import { unwrapState } from '../../unwrap-turns';
import type { Collections } from '../db';
import { AppError } from '../errors';
import { presenterGiftDayView } from './giftday-view';

/**
 * start: past the intro. spin: the reel landed on whose turn it is. more / last: their turn is
 * over, with gifts left or not (allAtOnce: always "last"). back: undo the last step.
 * `turnsTaken` is what the presenter saw, so a double tap or a second device can't skip anyone.
 */
export const AdvanceInput = v.object({
  action: v.picklist(['start', 'spin', 'more', 'last', 'back']),
  turnsTaken: v.pipe(v.number(), v.integer(), v.minValue(0)),
});
type Advance = v.InferOutput<typeof AdvanceInput>;

/** The presenter's next step in the unwrapping (32), stored on the edition. Returns the updated edition. */
export const advanceUnwrapping = async (db: Collections, group: Group, edition: Edition, { action, turnsTaken }: Advance) => {
  const view = presenterGiftDayView(group, edition).unwrapOrder;
  const order = edition.unwrapOrder;
  if (!view || !order) throw new AppError('NOT_DRAWN');
  const progress = order.progress;
  const turns = progress?.turns ?? [];
  if (turns.length !== turnsTaken || (action !== 'start' && !progress) || (action === 'start' && progress)) {
    throw new AppError('EDITION_CHANGED');
  }
  if ((action === 'more' || action === 'last') && !view.current) throw new AppError('EDITION_CHANGED');
  const filter = { _id: edition._id, 'unwrapOrder.shuffledAt': order.shuffledAt, 'unwrapOrder.progress.turns': { $size: turnsTaken } };
  const people = view.people.map((p) => p.memberId);
  const mode = edition.unwrapMode ?? 'allAtOnce';
  // One person left: there's nobody to spin between.
  const onlyOneLeft = (next: typeof turns) => unwrapState(people, mode, true, next).next === null;

  let update: object;
  if (action === 'start') {
    update = { $set: { 'unwrapOrder.progress': { startedAt: new Date(), turns: [], currentShown: people.length <= 1 } } };
  } else if (action === 'spin') {
    update = { $set: { 'unwrapOrder.progress.currentShown': true } };
  } else if (action === 'back') {
    update =
      turns.length === 0
        ? { $unset: { 'unwrapOrder.progress': true } }
        : { $pop: { 'unwrapOrder.progress.turns': 1 }, $set: { 'unwrapOrder.progress.currentShown': true } };
  } else {
    const turn = { memberId: view.current!.memberId, last: mode === 'allAtOnce' || action === 'last' };
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
