import type { Boards } from '../../guess-results';
import { drawsNames, isFromGiftDay, type Edition } from '../../schema/edition';
import type { Collections } from '../db';

/** Guess your Santa (62) is on unless the organizer switched it off, or there's no Santa to guess (88). */
export const guessingOn = (edition: Edition) => edition.guessing !== false && drawsNames(edition);

/**
 * A guess for `gifteeMemberId` can change from the draw until their Santa is out (94): shown at their turn, the big
 * reveal, or gift day is over.
 */
export const guessOpen = (edition: Edition, gifteeMemberId: string) =>
  guessingOn(edition) &&
  (edition.status === 'drawn' || edition.status === 'giftday') &&
  !(edition.reveal.enabled && edition.reveal.revealedAt) &&
  !(edition.unwrapOrder?.progress?.santaShownIds ?? []).includes(gifteeMemberId);

/** The presenter shows each person's Santa at their turn only from gift day on. */
export const santaStepOn = (edition: Edition) => guessingOn(edition) && isFromGiftDay(edition);

/** Everyone's guesses in this edition as boards, for working out the results that are out. Never returned as is. */
export const guessesOf = async (db: Collections, edition: Edition): Promise<Boards> => {
  if (!guessingOn(edition)) return {};
  const guesses = await db.guesses.find({ editionId: edition._id }).toArray();
  return Object.fromEntries(
    Object.entries(Object.groupBy(guesses, (guess) => guess.guesserMemberId)).map(([guesser, rows]) => [
      guesser,
      Object.fromEntries(rows!.map((row) => [row.gifteeMemberId, row.santaMemberId])),
    ])
  );
};
