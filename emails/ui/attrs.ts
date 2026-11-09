// Table attributes every email client understands (Outlook's Word engine included).

/** Layout tables: screen readers skip them. */
export const presentation = { role: 'presentation', cellPadding: 0, cellSpacing: 0, border: 0 } as const;

/** `bgcolor` on a cell (React's types only allow it on tables); styles alone miss some Outlooks. */
export const bgcolor = (value: string) => ({ bgcolor: value }) as object;
