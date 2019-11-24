import { adjectives, animals } from './data';

const getRandomItem = <T>(array: Array<T>): T => {
  return array[Math.floor(Math.random() * array.length)];
};

export const generateSlug = async (
  slugExists: (slug: string) => Promise<boolean>
): Promise<string> => {
  let isUnique = false;
  let slug = '';
  while (!isUnique) {
    slug = `${getRandomItem(adjectives)}-${getRandomItem(
      adjectives
    )}-${getRandomItem(animals)}`;
    isUnique = !(await slugExists(slug));

    if (!isUnique) {
      console.log('Had a slug collision! slug was', slug);
    }
  }

  return slug;
};
