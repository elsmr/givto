import type { Boards } from '../../guess-results';
import { isFromGiftDay, type Edition } from '../../schema/edition';
import type { Guess } from '../../schema/guess';
import type { Collections } from '../db';

/** Guess your Santa (62) is on unless the organizer switched it off. */
export const guessingOn = (edition: Edition) => edition.guessing !== false;

/** Guessing is open while shopping, closed once gift day starts (by date or by hand); back to shopping opens it again. */
export const guessingOpen = (edition: Edition) => guessingOn(edition) && edition.status === 'drawn';

/** The presenter shows each person's Santa at their turn only from gift day on, when nobody can guess any more. */
export const santaStepOn = (edition: Edition) => guessingOn(edition) && isFromGiftDay(edition);

/** A stored guess as a board (82): giftee → guessed Santa, their own row (62) included. */
export const boardOf = (guess: Guess) => ({
  ...Object.fromEntries((guess.pairs ?? []).map((pair) => [pair.gifteeMemberId, pair.santaMemberId])),
  [guess.guesserMemberId]: guess.guessedMemberId,
});

/** Everyone's board in this edition, for working out the results that are out. Never returned as is. */
export const guessesOf = async (db: Collections, edition: Edition): Promise<Boards> => {
  if (!guessingOn(edition)) return {};
  const guesses = await db.guesses.find({ editionId: edition._id }).toArray();
  return Object.fromEntries(guesses.map((guess) => [guess.guesserMemberId, boardOf(guess)]));
};
