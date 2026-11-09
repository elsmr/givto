import { useEffect, useState } from 'react';

const KEY = 'givto:join-name';

/**
 * The name survives the magic link round trip (the link may open in another tab); signed in,
 * it starts from the account's name.
 */
export const useJoinName = (accountName: string | undefined) => {
  const [name, setName] = useState('');
  useEffect(() => setName(localStorage.getItem(KEY) || accountName || ''), [accountName]);
  return {
    name,
    setName,
    remember: () => localStorage.setItem(KEY, name),
    forget: () => localStorage.removeItem(KEY),
  };
};
