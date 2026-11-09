import { useEffect, useState } from 'react';

/** Seconds left until `start()` may be used again. */
export const useCooldown = (seconds: number) => {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (until <= now) return;
    const timer = setTimeout(() => setNow(Date.now()), 1000);
    return () => clearTimeout(timer);
  }, [until, now]);

  const start = () => {
    const started = Date.now();
    setNow(started);
    setUntil(started + seconds * 1000);
  };
  return { secondsLeft: Math.max(0, Math.ceil((until - now) / 1000)), start };
};
