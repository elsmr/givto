const LS_AUTH_KEY = 'givto-access-token';

export const AuthUtils = {
  storeToken: (token: string): void => {
    localStorage.setItem(LS_AUTH_KEY, token);
  },
  getToken: (): string | null => {
    return localStorage.getItem(LS_AUTH_KEY);
  },
  getAuthHeaders: (): Record<string, string> => {
    const token = AuthUtils.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
  AUTH_QUERY: `query getCurrentUser {
    getCurrentUser {
      id
      name
      email
    }
  }`
};
