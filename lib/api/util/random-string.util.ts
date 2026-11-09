import { customAlphabet } from 'nanoid';
import { nolookalikes } from 'nanoid-dictionary';

export const randomString = (length = 21): string =>
  customAlphabet(nolookalikes, length)();
