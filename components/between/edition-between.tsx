import type { EditionInput } from './edition-input';
import { ForYouSection } from './for-you-section';
import { SantaSection } from './santa-section';
import { TipsAboutPeople } from './tips-about-people';

/**
 * Between people on a group home (42, 52, 30): Psst!s and questions from your Santa, your
 * giftee (tips for you, ask a question, Psst!) and tips you leave about others. Each part
 * renders nothing when it doesn't apply. Pages using this must load the `between` messages.
 */
export const EditionBetween = ({ groupSlug, editionNumber }: EditionInput) => {
  const input = { groupSlug, editionNumber };
  return (
    <div className="flex flex-col gap-8">
      <ForYouSection input={input} />
      <div className="grid gap-8 lg:grid-cols-2 [&>*]:min-w-0">
        <SantaSection input={input} />
        <TipsAboutPeople input={input} />
      </div>
    </div>
  );
};
