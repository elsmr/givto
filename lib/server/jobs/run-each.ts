import { log } from '../log';

export type JobCounts = Record<string, number>;

/**
 * Runs `fn` for each item and counts what it returns ('sent', 'optedOut', …). One failure
 * (Mailgun down, a broken record) is logged and counted; the rest still go out.
 */
export const runEach = async <T>(job: string, items: T[], fn: (item: T) => Promise<string | undefined>): Promise<JobCounts> => {
  const counts: JobCounts = {};
  for (const item of items) {
    let outcome: string;
    try {
      outcome = (await fn(item)) ?? 'skipped';
    } catch (error) {
      log.error({ err: error, job }, 'job item failed');
      outcome = 'failed';
    }
    counts[outcome] = (counts[outcome] ?? 0) + 1;
  }
  return counts;
};

export const addCounts = (...all: JobCounts[]): JobCounts =>
  all.reduce((sum, counts) => {
    for (const [key, value] of Object.entries(counts)) sum[key] = (sum[key] ?? 0) + value;
    return sum;
  }, {});
