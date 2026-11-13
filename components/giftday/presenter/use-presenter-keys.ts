import { useEffect } from 'react';

export type PresenterKeyActions = { next?: () => void; previous?: () => void; last?: () => void };

const keyActions: Record<string, keyof PresenterKeyActions> = {
  ArrowRight: 'next',
  ArrowDown: 'next',
  PageDown: 'next',
  ' ': 'next',
  Enter: 'next',
  ArrowLeft: 'previous',
  ArrowUp: 'previous',
  PageUp: 'previous',
  l: 'last',
  L: 'last',
};

/** Presenter keyboard (and clicker) control. Space and Enter on a focused button keep their own meaning; dialogs and form fields keep all keys. */
export const usePresenterKeys = (actions: PresenterKeyActions) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const action = keyActions[event.key];
      const run = action && actions[action];
      if (!run || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof Element && event.target.closest('[role="dialog"], [role="alertdialog"], input, select, textarea')) return;
      const onControl = event.target instanceof Element && event.target.closest('button, a, [role="switch"]');
      if (onControl && (event.key === ' ' || event.key === 'Enter')) return;
      event.preventDefault();
      run();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actions]);
};
