import { randomString } from '../util/random-string.util';

export const generateSlug = async (
  slugExists: (slug: string) => Promise<boolean>
): Promise<string> => {
  let isUnique = false;
  let slug = '';
  while (!isUnique) {
    slug = randomString(8);
    isUnique = !(await slugExists(slug));

    if (!isUnique) {
      console.log('Had a slug collision! slug was', slug);
    }
  }

  return slug;
};
