/** Punto de entrada del motor. */
export { Game, ACTIONS, CAPS, MAX_MERCS } from './game.js';
import './scenes.js';
import './combat.js';
import './items.js';
import './expansions.js';
export { buildCatalog, listPacks, normName, looseName, buildCustomHeroPreview, resolveRemovals } from './catalog.js';
export { RNG } from './rng.js';
export { weaknessName } from './combat.js';
