import { customAlphabet } from 'nanoid';
import nolookalikes from 'nanoid-dictionary/nolookalikes';

export const randomString = (length = 21): string =>
  customAlphabet(nolookalikes, length)();
