import { drawRouter } from './draw';
import { editionRouter } from './edition';
import { settingsRouter } from './settings';

/** Draw & settings slice (27, 28, 33, 34), spread into the app router as `draw`, `edition` and `settings`. */
export const drawRouters = { draw: drawRouter, edition: editionRouter, settings: settingsRouter };
