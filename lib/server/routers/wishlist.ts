import { claimRouter } from './claim';
import { importRouter } from './import';
import { wishRouter } from './wish';

/** Wishlist slice (38, 39, 46), spread into the app router as `wish`, `claim` and `import`. */
export const wishlistRouters = { wish: wishRouter, claim: claimRouter, import: importRouter };
