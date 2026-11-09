export type CurrentUser = {
  name: string;
  email: string;
  locale?: string | null;
};

// Signed-out stub; the coordinator wires these to F1's Better Auth client at merge.
export const useCurrentUser = (): CurrentUser | null => null;

export const signOut = async (): Promise<void> => {};
