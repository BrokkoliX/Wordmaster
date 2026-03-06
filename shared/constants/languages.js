/**
 * Shared language configuration for Wordmaster.
 *
 * This is the single source of truth for supported languages, hub
 * designations, and display metadata.  All layers (mobile, backend,
 * admin, pipeline scripts) should import from here instead of
 * maintaining their own copies.
 */

const LANGUAGES = {
  en: { name: 'English',    flag: '\u{1F1EC}\u{1F1E7}', code: 'EN', hub: true  },
  es: { name: 'Spanish',    flag: '\u{1F1EA}\u{1F1F8}', code: 'ES', hub: false },
  fr: { name: 'French',     flag: '\u{1F1EB}\u{1F1F7}', code: 'FR', hub: true  },
  de: { name: 'German',     flag: '\u{1F1E9}\u{1F1EA}', code: 'DE', hub: true  },
  hu: { name: 'Hungarian',  flag: '\u{1F1ED}\u{1F1FA}', code: 'HU', hub: false },
  pt: { name: 'Portuguese', flag: '\u{1F1F5}\u{1F1F9}', code: 'PT', hub: true  },
  ru: { name: 'Russian',    flag: '\u{1F1F7}\u{1F1FA}', code: 'RU', hub: false },
  it: { name: 'Italian',    flag: '\u{1F1EE}\u{1F1F9}', code: 'IT', hub: true  },
  nl: { name: 'Dutch',      flag: '\u{1F1F3}\u{1F1F1}', code: 'NL', hub: false },
  pl: { name: 'Polish',     flag: '\u{1F1F5}\u{1F1F1}', code: 'PL', hub: false },
  cs: { name: 'Czech',      flag: '\u{1F1E8}\u{1F1FF}', code: 'CS', hub: false },
};

const HUB_LANGUAGES = Object.entries(LANGUAGES)
  .filter(([, v]) => v.hub)
  .map(([k]) => k);

const ALL_LANGUAGE_CODES = Object.keys(LANGUAGES);

/**
 * Build the list of language pairs that Wordmaster supports.
 *
 * Rules:
 *  - Every hub pairs with every other language (both directions).
 *  - Pairs between two non-hub languages are excluded.
 *  - Duplicate undirected pairs are emitted only once (the canonical
 *    direction has the hub as `source`; the reverse is generated at
 *    export time by swapping source_word / target_word).
 *
 * Returns an array of { source, target } objects.  Each object
 * represents one undirected pair; the pipeline generates both
 * directed JSON files from it.
 */
function buildHubPairs() {
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

/**
 * Format a language pair for display.
 *
 * @param {string} source - ISO 639-1 code
 * @param {string} target - ISO 639-1 code
 * @returns {string} e.g. "French → German"
 */
function formatPairName(source, target) {
  const s = LANGUAGES[source];
  const t = LANGUAGES[target];
  if (!s || !t) return `${source} → ${target}`;
  return `${s.name} → ${t.name}`;
}

/**
 * Return the flag emoji for a language code.
 */
function getFlag(code) {
  return LANGUAGES[code]?.flag || '';
}

module.exports = {
  LANGUAGES,
  HUB_LANGUAGES,
  ALL_LANGUAGE_CODES,
  buildHubPairs,
  formatPairName,
  getFlag,
};
