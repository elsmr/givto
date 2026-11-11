export const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;
// Sentence punctuation right after a URL ("see https://x.com/a.") belongs to the sentence.
export const TRAILING_PUNCTUATION = /[.,;:!?)\]]+$/;

/** The http(s) URLs in a text, in order. */
export const findUrls = (text: string) => [...text.matchAll(URL_PATTERN)].map(([url]) => url.replace(TRAILING_PUNCTUATION, ''));

/** The text without these URLs and the spaces before them. */
export const removeUrls = (text: string, urls: string[]) =>
  // Longest first: a URL can start with another one.
  urls
    .toSorted((a, b) => b.length - a.length)
    .reduce(
      (rest, url) =>
        rest
          .split(url)
          .map((part, index, parts) => (index < parts.length - 1 ? part.trimEnd() : part))
          .join(''),
      text
    )
    .trim();
