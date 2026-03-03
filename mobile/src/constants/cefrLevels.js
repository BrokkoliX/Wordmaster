/**
 * CEFR (Common European Framework of Reference for Languages) Levels.
 *
 * Canonical source: shared/constants/cefr-levels.js
 * This mobile copy exists because Metro cannot resolve paths outside
 * the project root.  Keep both files in sync when editing.
 */

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const CEFR_LEVEL_DESCRIPTIONS = {
  A1: 'Beginner - Basic phrases and expressions',
  A2: 'Elementary - Simple everyday situations',
  B1: 'Intermediate - Main points of familiar topics',
  B2: 'Upper Intermediate - Complex text on concrete and abstract topics',
  C1: 'Advanced - Wide range of demanding texts',
  C2: 'Proficient - Virtually everything heard or read',
};

export const CEFR_LEVEL_ORDER = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
};

/**
 * Get all CEFR levels up to and including the specified level.
 */
export function getLevelsUpTo(maxLevel) {
  const maxOrder = CEFR_LEVEL_ORDER[maxLevel];
  return CEFR_LEVELS.filter(level => CEFR_LEVEL_ORDER[level] <= maxOrder);
}

/**
 * Compare two CEFR levels.
 * @returns {number} -1 if level1 < level2, 0 if equal, 1 if level1 > level2
 */
export function compareLevels(level1, level2) {
  const order1 = CEFR_LEVEL_ORDER[level1];
  const order2 = CEFR_LEVEL_ORDER[level2];
  return order1 < order2 ? -1 : order1 > order2 ? 1 : 0;
}
