import { useSyncExternalStore } from 'react';

// Tab-scoped on purpose: opening the app later must not show the giftee's name until tapped again.
const revealed = new Set<string>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Whether my giftee is revealed for this edition; shared by every section that names the giftee. */
export const useGifteeRevealed = (groupSlug: string, editionNumber: number) => {
  const key = `${groupSlug}/${editionNumber}`;
  const isRevealed = useSyncExternalStore(
    subscribe,
    () => revealed.has(key),
    () => false,
  );
  const setRevealed = (value: boolean) => {
    if (value) revealed.add(key);
    else revealed.delete(key);
    listeners.forEach((listener) => listener());
  };
  return [isRevealed, setRevealed] as const;
};
