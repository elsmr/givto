import * as v from 'valibot';
import { HttpUrl } from '../../schema/common';
import { AppError } from '../errors';
import { importProduct } from '../import/import-product';
import { ImportError } from '../import/safe-fetch';
import { enforceRateLimit } from '../rate-limit';
import { authedProcedure, router } from '../trpc';

const IMPORT_LIMIT = { window: 10 * 60, max: 20 };

/** Paste a product URL, get a prefilled wish to edit before saving (39). */
export const importRouter = router({
  fromUrl: authedProcedure.input(v.object({ url: HttpUrl })).mutation(async ({ ctx, input }) => {
    await enforceRateLimit(`import:user:${ctx.user.id}`, IMPORT_LIMIT);
    try {
      return await importProduct(input.url, ctx.user.id);
    } catch (error) {
      if (!(error instanceof ImportError)) throw error;
      if (error.reason === 'blocked') throw new AppError('IMPORT_BLOCKED');
      throw new AppError('IMPORT_FAILED', { details: { reason: error.reason } });
    }
  }),
});
