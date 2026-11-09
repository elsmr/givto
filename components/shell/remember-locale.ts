export const localeCookie = 'NEXT_LOCALE';

// Next's locale detection on `/` reads this cookie before Accept-Language.
export const rememberLocale = (locale: string) => {
  const secure = location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `${localeCookie}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax${secure}`;
};
