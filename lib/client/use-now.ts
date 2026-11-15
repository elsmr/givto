import { useEffect, useState } from 'react';

/** The time now; while `live`, again every second, for a countdown that ticks on an open page. */
export const useNow = (live: boolean): Date => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [live]);
  return live ? now : new Date();
};
