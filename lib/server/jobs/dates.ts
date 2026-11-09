/** The same instant `months` calendar months earlier (UTC). */
export const monthsBefore = (now: Date, months: number) => {
  const date = new Date(now);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date;
};

/** YYYY-MM-DD of an instant in UTC: close enough (± a day) for retention cut-offs. */
export const isoDate = (date: Date) => date.toISOString().slice(0, 10);
