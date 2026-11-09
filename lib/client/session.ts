import { authClient } from './auth';

export type CurrentUser = {
  name: string;
  email: string;
  locale?: string | null;
};

// Null while the session loads, so server HTML and first client render match (static home).
export const useCurrentUser = (): CurrentUser | null => {
  const { data } = authClient.useSession();
  return data?.user ?? null;
};

export const signOut = async (): Promise<void> => {
  await authClient.signOut();
};
