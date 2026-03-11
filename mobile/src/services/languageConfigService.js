/**
 * Fetches the admin-controlled language & feature config from the backend
 * and caches it in AsyncStorage so it is available offline.
 *
 * Shape returned by GET /api/config/languages:
 *   {
 *     languages: ['en', 'fr', 'de', ...],
 *     pairs: [
 *       { id: 'en-fr', features: { multiple_choice: true, fill_in_blank: false, ... } },
 *       ...
 *     ]
 *   }
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const CACHE_KEY = 'language_config_cache';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Default config used when the backend is unreachable and no cache exists.
// All features enabled so existing users are not blocked by a failed fetch.
const DEFAULT_CONFIG = {
  languages: [],
  pairs: [],
  _fallback: true,
};

/**
 * Load config, trying the network first and falling back to cache.
 *
 * @returns {Promise<{ languages: string[], pairs: Array<{id: string, features: object}>, _fallback?: boolean }>}
 */
export async function fetchLanguageConfig() {
  try {
    const { data } = await api.get('/config/languages');

    const config = {
      languages: data.languages || [],
      pairs: data.pairs || [],
      _cachedAt: Date.now(),
    };

    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(config));
    return config;
  } catch {
    // Network unavailable – try the cache
    return loadCachedConfig();
  }
}

/**
 * Load from AsyncStorage. Returns DEFAULT_CONFIG if nothing is cached
 * or the cache has expired.
 */
async function loadCachedConfig() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return DEFAULT_CONFIG;

    const cached = JSON.parse(raw);
    const age = Date.now() - (cached._cachedAt || 0);

    if (age > CACHE_TTL_MS) return DEFAULT_CONFIG;
    return cached;
  } catch {
    return DEFAULT_CONFIG;
  }
}

/**
 * Returns true if the given language code is enabled in the config.
 *
 * @param {object} config – value from LanguageConfigContext
 * @param {string} langCode – ISO 639-1 code, e.g. 'fr'
 */
export function isLanguageEnabled(config, langCode) {
  if (!config || config._fallback) return true; // fail-open
  return config.languages.includes(langCode);
}

/**
 * Returns the feature flags for a language pair, or all-true when the
 * config is unavailable (fail-open).
 *
 * @param {object} config – value from LanguageConfigContext
 * @param {string} sourceLang
 * @param {string} targetLang
 * @returns {{ multiple_choice: boolean, matching_pairs: boolean,
 *             type_translation: boolean, fill_in_blank: boolean,
 *             smart_review: boolean }}
 */
export function getPairFeatures(config, sourceLang, targetLang) {
  const allOn = {
    multiple_choice: true,
    matching_pairs: true,
    type_translation: true,
    fill_in_blank: true,
    smart_review: true,
  };

  if (!config || config._fallback) return allOn;

  const pairId = `${sourceLang}-${targetLang}`;
  const pair = config.pairs.find((p) => p.id === pairId);

  if (!pair) return allOn; // pair not configured – fail-open
  return { ...allOn, ...pair.features };
}
