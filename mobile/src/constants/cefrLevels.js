/**
 * CEFR level constants — re-exported from the shared module for use
 * throughout the mobile app.
 *
 * This file exists because the shared/ directory uses CommonJS (module.exports)
 * while the mobile app uses ES module imports.
 */

const shared = require('../../../shared/constants/cefr-levels');

export const CEFR_LEVELS = shared.CEFR_LEVELS;
export const CEFR_LEVEL_DESCRIPTIONS = shared.CEFR_LEVEL_DESCRIPTIONS;
export const CEFR_LEVEL_ORDER = shared.CEFR_LEVEL_ORDER;
export const getLevelsUpTo = shared.getLevelsUpTo;
export const compareLevels = shared.compareLevels;

export default shared;
