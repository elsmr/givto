import { User } from '@givto/api/graphql-schema';
import unfetch from 'isomorphic-unfetch';
import { createContext } from 'react';

const LS_AUTH_KEY = 'givto-access-token';

export interface Token {
  token: string;
  exp: number;
  redirectUrl?: string;
}

export interface IAuthContext {
  isLoading: boolean;
  isInitialized: boolean;
  token: Token | null;
  user: User | null;
}

type AuthSubscriber = (token: Token | null) => void;

const tokenSubscribers: AuthSubscriber[] = [];

const tokenCall = async (
  url: string,
  options: RequestInit = {}
): Promise<Token> => {
  AuthUtils.clearToken();
  const response = await unfetch(url, { method: 'POST', ...options });

  if (response.status !== 200) {
    throw new Error('Token call failed');
  }

  const token = await response.json();
  AuthUtils.storeToken(token);

  for (const subscriber of tokenSubscribers) {
    subscriber(token);
  }
  return token;
};

export const AuthUtils = {
  storeToken: (token: Token): void => {
    localStorage.setItem(LS_AUTH_KEY, JSON.stringify(token));
  },
  getToken: (): Token | null => {
    try {
      const tokenString = localStorage.getItem(LS_AUTH_KEY);
      return JSON.parse(tokenString as string);
    } catch (e) {
      return null;
    }
  },
  clearToken: (): void => {
    return localStorage.removeItem(LS_AUTH_KEY);
  },
  getAuthHeaders: (token: Token | null): Record<string, string> => {
    return token ? { Authorization: `Bearer ${token.token}` } : {};
  },
  AUTH_QUERY: `query getCurrentUser {
    getCurrentUser {
      id
      name
      email
    }
  }`,
  login: async (email: string, loginCode: string): Promise<Token> =>
    tokenCall('/api/auth?action=login', {
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ email, loginCode }),
    }),
  refresh: async (): Promise<Token> => tokenCall('/api/auth?action=refresh'),
  logout: async (token: Token | null): Promise<void> => {
    AuthUtils.clearToken();
    for (const subscriber of tokenSubscribers) {
      subscriber(null);
    }
    await unfetch('/api/auth?action=logout', {
      method: 'POST',
      ...AuthUtils.getAuthHeaders(token),
    });
  },
  subscribe(subscriber: AuthSubscriber): void {
    tokenSubscribers.push(subscriber);
  },
};

export const initialAuthContext: IAuthContext = {
  isLoading: false,
  isInitialized: false,
  token: null,
  user: null,
};

export const AuthContext = createContext(initialAuthContext);
