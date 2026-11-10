import { useState, type RefObject } from 'react';

export const groupTabs = ['overview', 'giftee', 'wishlist', 'people'] as const;
export type GroupTab = (typeof groupTabs)[number];

const fromHash = (available: readonly GroupTab[]): GroupTab => {
  const hash = typeof window === 'undefined' ? '' : window.location.hash.slice(1);
  return available.find((tab) => tab === hash) ?? 'overview';
};

/**
 * The group home's tab (61), kept in the URL hash (#giftee, #wishlist, #people) so a reload keeps it.
 * Switching scrolls back to `top` when the page was scrolled past it.
 */
export const useGroupTab = (available: readonly GroupTab[], top: RefObject<HTMLElement | null>) => {
  const [tab, setTab] = useState(() => fromHash(available));
  const select = (next: GroupTab) => {
    setTab(next);
    const { pathname, search } = window.location;
    window.history.replaceState(window.history.state, '', next === 'overview' ? pathname + search : `${pathname}${search}#${next}`);
    if (top.current && top.current.getBoundingClientRect().top < 0) top.current.scrollIntoView();
  };
  return [available.includes(tab) ? tab : 'overview', select] as const;
};
