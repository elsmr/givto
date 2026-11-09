import { useEffect } from 'react';

type PresenterActions = { next: () => void; previous: () => void; first: () => void; last: () => void };

const keyActions: Record<string, keyof PresenterActions> = {
  ArrowRight: 'next',
  ArrowDown: 'next',
  PageDown: 'next',
  ' ': 'next',
  Enter: 'next',
  ArrowLeft: 'previous',
  ArrowUp: 'previous',
  PageUp: 'previous',
  Home: 'first',
  End: 'last',
};

/** Presenter keyboard (and clicker) control. Space and Enter on a focused control keep their own meaning. */
export const usePresenterKeys = (actions: PresenterActions) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const action = keyActions[event.key];
      if (!action || event.altKey || event.ctrlKey || event.metaKey) return;
      const onControl = event.target instanceof Element && event.target.closest('button, a, input, [role="switch"]');
      if (onControl && (event.key === ' ' || event.key === 'Enter')) return;
      event.preventDefault();
      actions[action]();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actions]);
};
