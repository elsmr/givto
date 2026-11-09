import { useEffect, useState } from 'react';

const KEY = 'givto:join-name';

/** The name survives the magic link round trip (the link may open in another tab). */
export const useJoinName = () => {
  const [name, setName] = useState('');
  useEffect(() => setName(localStorage.getItem(KEY) ?? ''), []);
  return {
    name,
    setName,
    remember: () => localStorage.setItem(KEY, name),
    forget: () => localStorage.removeItem(KEY),
  };
};
