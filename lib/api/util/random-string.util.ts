import nolookalikes from 'nanoid-dictionary/nolookalikes';
import generate from 'nanoid/generate';

export const randomString = (length = 21) => generate(nolookalikes, length);
