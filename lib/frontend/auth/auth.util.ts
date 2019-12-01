import { User } from '@givto/api/graphql-schema';
import unfetch from 'isomorphic-unfetch';
import { createContext } from 'react';

const LS_AUTH_KEY = 'givto-access-token';

export interface Token {
  token: string;
  exp: number;
}

export interface IAuthContext {
  isLoading: boolean;
  token: Token | null;
  user: User | null;
}

type TokenSubscriber = (token: Token | null, isLoading: boolean) => void;

const tokenSubscribers: TokenSubscriber[] = [];

const tokenCall = async (
  url: string,
  options: RequestInit = {}
): Promise<Token> => {
  AuthUtils.clearToken();
  for (const subscriber of tokenSubscribers) {
    subscriber(null, true);
  }
  const response = await unfetch(url, { method: 'POST', ...options });

  if (response.status !== 200) {
    throw new Error('Token call failed');
  }

  const token = await response.json();
  AuthUtils.storeToken(token);
  for (const subscriber of tokenSubscribers) {
    subscriber(token, false);
  }
  return token;
};

export const AuthUtils = {
  storeToken: (token: Token): void => {
    localStorage.setItem(LS_AUTH_KEY, JSON.stringify(token));
  },
  getToken: (): Token | null => {
    console.log('get token');
    try {
      const tokenString = localStorage.getItem(LS_AUTH_KEY);
      console.log('LS', tokenString);
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
  login: async (loginCode: string): Promise<Token> =>
    tokenCall('/api/auth/login', {
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ loginCode })
    }),
  refresh: async (): Promise<Token> => tokenCall('/api/auth/refresh'),
  logout: async (token: Token | null): Promise<void> => {
    AuthUtils.clearToken();
    for (const subscriber of tokenSubscribers) {
      subscriber(null, false);
    }
    await unfetch('/api/auth/logout', {
      method: 'POST',
      ...AuthUtils.getAuthHeaders(token)
    });
  },
  subscribe(subscriber: TokenSubscriber): void {
    tokenSubscribers.push(subscriber);
  }
};

export const initialAuthContext: IAuthContext = {
  isLoading: true,
  token: AuthUtils.getToken(),
  user: null
};

export const AuthContext = createContext(initialAuthContext);
