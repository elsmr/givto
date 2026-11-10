/** The shop a wish link points to, as its chip shows it: the host without "www.". */
export const shopName = (url: string) => new URL(url).hostname.replace(/^www\./, '');
