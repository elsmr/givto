/** Whole days from today in `timeZone` to a local date (YYYY-MM-DD); 0 on the day, negative after. */
export const daysUntil = (date: string, timeZone: string, now = new Date()): number => {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000);
};
