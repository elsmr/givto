const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;
// Sentence punctuation right after a URL ("see https://x.com/a.") belongs to the sentence.
const TRAILING_PUNCTUATION = /[.,;:!?)\]]+$/;

type Part = { text: string; href?: string };

const split = (text: string): Part[] => {
  const { parts, at } = [...text.matchAll(URL_PATTERN)].reduce<{ parts: Part[]; at: number }>(
    (acc, match) => {
      const url = match[0].replace(TRAILING_PUNCTUATION, '');
      return { parts: [...acc.parts, { text: text.slice(acc.at, match.index) }, { text: url, href: url }], at: match.index + url.length };
    },
    { parts: [], at: 0 }
  );
  return [...parts, { text: text.slice(at) }];
};

/** Plain text with its http(s) URLs as links; everything else stays text. */
export const LinkedText = ({ text }: { text: string }) => {
  return (
    <>
      {split(text).map((part, index) =>
        part.href ? (
          <a key={index} href={part.href} target="_blank" rel="noopener noreferrer nofollow ugc" className="break-all underline">
            {part.text}
          </a>
        ) : (
          part.text
        )
      )}
    </>
  );
};
