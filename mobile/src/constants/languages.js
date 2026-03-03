/**
 * Language constants — re-exported from the shared module for use
 * throughout the mobile app.
 */

const shared = require('../../../shared/constants/languages');

export const LANGUAGES = shared.LANGUAGES;
export const HUB_LANGUAGES = shared.HUB_LANGUAGES;
export const ALL_LANGUAGE_CODES = shared.ALL_LANGUAGE_CODES;
export const buildHubPairs = shared.buildHubPairs;
export const formatPairName = shared.formatPairName;
export const getFlag = shared.getFlag;

/**
 * Convenience map: language code -> display name.
 * Used by screens that only need { code: name } lookups.
 */
export const LANGUAGE_NAMES = Object.fromEntries(
  Object.entries(shared.LANGUAGES).map(([code, meta]) => [code, meta.name])
);

/**
 * Array format used by SettingsScreen pickers.
 */
export const LANGUAGE_LIST = Object.entries(shared.LANGUAGES).map(([code, meta]) => ({
  code,
  name: meta.name,
  flag: meta.flag,
}));

export default shared;
