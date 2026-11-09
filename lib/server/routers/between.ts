import { nudgeRouter } from './nudge';
import { questionRouter } from './question';
import { tipRouter } from './tip';

/** Between people (42, 52, 30), spread into the app router as `tip`, `question` and `nudge`. */
export const betweenRouters = { tip: tipRouter, question: questionRouter, nudge: nudgeRouter };
