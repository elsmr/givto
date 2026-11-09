import { AuthUtils, Token } from '../auth/auth.util';

const BASE_FETCH_OPTIONS: RequestInit = {
  headers: {
    'Content-Type': 'application/json'
  }
};

let isRefreshing = false;
let refreshPromise: Promise<Token | null> = Promise.resolve(null);

export const customFetch = async (
  input: RequestInfo,
  init?: RequestInit
): Promise<Response> => {
  const requestInit = { ...BASE_FETCH_OPTIONS, ...init };
  const response = await fetch(input, requestInit);
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
      isRefreshing = true;
      refreshPromise = AuthUtils.refresh();
    }
    const refreshResponse = await refreshPromise;
    isRefreshing = false;
    if (refreshResponse?.token) {
      requestHeaders.set('Authorization', `Bearer ${refreshResponse.token}`);
      return await fetch(input, { ...requestInit, headers: requestHeaders });
    }
  }

  return response;
};

// Export as default for backwards compatibility
export { customFetch as fetch };
