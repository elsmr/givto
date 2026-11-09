import type { RouterOutputs } from '@/lib/client/trpc';

export type PresenterView = RouterOutputs['giftday']['presenter'];

export type PresenterStep =
  | { kind: 'intro' }
  | { kind: 'person'; name: string; number: number; total: number }
  | { kind: 'reveal' }
  | { kind: 'end' };

/** Intro, everyone in unwrap order, the big reveal when it's on and gift day has come, the end. */
export const presenterSteps = (view: PresenterView): PresenterStep[] => {
  const people = view.unwrapOrder?.people ?? [];
  const canReveal = view.reveal.enabled && (view.status === 'giftday' || view.status === 'done');
  return [
    { kind: 'intro' },
    ...people.map((person, index): PresenterStep => ({ kind: 'person', name: person.name, number: index + 1, total: people.length })),
    ...(canReveal ? [{ kind: 'reveal' } as const] : []),
    { kind: 'end' },
  ];
};
