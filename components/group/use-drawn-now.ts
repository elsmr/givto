import type { EditionStatus } from '@/lib/schema/edition';
import { useState } from 'react';

/** True once this page has seen the edition go from open to drawn: names were drawn just now. */
export const useDrawnNow = (status: EditionStatus) => {
  const [seen, setSeen] = useState(status);
  const [drawnNow, setDrawnNow] = useState(false);
  if (seen !== status) {
    setSeen(status);
    setDrawnNow(seen === 'open' && status === 'drawn');
  }
  return drawnNow;
};
