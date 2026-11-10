import { useEffect, useRef } from 'react';

/**
 * Multi-step flows swap the whole form, so focus falls back to the page: move it to the new
 * step's heading (49). Steps whose first field takes focus itself (autoFocus) keep it.
 */
export const useFocusStepHeading = (step: string) => {
  const heading = useRef<HTMLHeadingElement>(null);
  const previous = useRef(step);
  useEffect(() => {
    if (previous.current === step) return;
    previous.current = step;
    if (document.activeElement === document.body) heading.current?.focus();
  }, [step]);
  return heading;
};
