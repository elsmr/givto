import unfetch from 'isomorphic-unfetch';
import { AuthUtils, Token } from '../auth/auth.util';

const BASE_FETCH_OPTIONS: RequestInit = {
  headers: {
    'Content-Type': 'application/json'
  }
};

let isRefreshing = false;
let refreshPromise: Promise<Token | null> = Promise.resolve(null);

export const fetch = async (
  input: RequestInfo,
  init?: RequestInit
): Promise<Response> => {
  const requestInit = { ...BASE_FETCH_OPTIONS, ...init };
  const response = await unfetch(input, requestInit);
  const requestHeaders = new Headers(requestInit.headers);
  const authHeader = requestHeaders.get('Authorization');
  const json = await response.clone().json();

  if (
    authHeader &&
    (response.status === 401 ||
      json?.errors?.some(
        (error: any) => error?.extensions?.code === 'UNAUTHENTICATED'
      ))
  ) {
    if (!isRefreshing) {
      console.log('got a 401!, starting refresh');
      isRefreshing = true;
      refreshPromise = AuthUtils.refresh();
    }
    console.log('waiting for refresh...');
    const response = await refreshPromise;
    isRefreshing = false;
    console.log('refresh done', response);
    if (response?.token) {
      requestHeaders.set('Authorization', `Bearer ${response.token}`);
      return await unfetch(input, { ...requestInit, headers: requestHeaders });
    }
  }

  return response;
};
