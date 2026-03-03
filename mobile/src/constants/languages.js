/**
 * Language constants for the mobile app.
 *
 * Canonical source: shared/constants/languages.js
 * This mobile copy exists because Metro cannot resolve paths outside
 * the project root.  Keep both files in sync when editing.
 */

export const LANGUAGES = {
  en: { name: 'English',    flag: '\u{1F1EC}\u{1F1E7}', code: 'EN', hub: true  },
  es: { name: 'Spanish',    flag: '\u{1F1EA}\u{1F1F8}', code: 'ES', hub: false },
  fr: { name: 'French',     flag: '\u{1F1EB}\u{1F1F7}', code: 'FR', hub: true  },
  de: { name: 'German',     flag: '\u{1F1E9}\u{1F1EA}', code: 'DE', hub: true  },
  hu: { name: 'Hungarian',  flag: '\u{1F1ED}\u{1F1FA}', code: 'HU', hub: false },
  pt: { name: 'Portuguese', flag: '\u{1F1F5}\u{1F1F9}', code: 'PT', hub: true  },
  ru: { name: 'Russian',    flag: '\u{1F1F7}\u{1F1FA}', code: 'RU', hub: false },
};

export const HUB_LANGUAGES = Object.entries(LANGUAGES)
  .filter(([, v]) => v.hub)
  .map(([k]) => k);

export const ALL_LANGUAGE_CODES = Object.keys(LANGUAGES);

export function buildHubPairs() {
  const seen = new Set();
  const pairs = [];
  for (const hub of HUB_LANGUAGES) {
    for (const lang of ALL_LANGUAGE_CODES) {
      if (lang === hub) continue;
      const key = [hub, lang].sort().join('-');
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push({ source: hub, target: lang });
    }
  }
  return pairs;
}

export function formatPairName(source, target) {
  const s = LANGUAGES[source];
  const t = LANGUAGES[target];
  if (!s || !t) return `${source} → ${target}`;
  return `${s.name} → ${t.name}`;
}

export function getFlag(code) {
  return LANGUAGES[code]?.flag || '';
}

/**
 * Convenience map: language code -> display name.
 * Used by screens that only need { code: name } lookups.
 */
export const LANGUAGE_NAMES = Object.fromEntries(
  Object.entries(LANGUAGES).map(([code, meta]) => [code, meta.name])
);

/**
 * Array format used by SettingsScreen pickers.
 */
export const LANGUAGE_LIST = Object.entries(LANGUAGES).map(([code, meta]) => ({
  code,
  name: meta.name,
  flag: meta.flag,
}));
