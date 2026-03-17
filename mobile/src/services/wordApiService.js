/**
 * Fetches words from the backend API and caches them in local SQLite.
 *
 * Architecture:
 *   1. Primary source   — backend API (all words, all levels)
 *   2. Local cache      — SQLite (survives offline after first sync)
 *   3. Starter fallback — A1-only JSON bundled in the app (~800 KB)
 *      Used only on the very first launch when the API is unreachable.
 */

import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import db from './sqliteConnection';

// Compact A1-only starter set for first-launch fallback (~800 KB).
// Keyed by "sourceLang_targetLang" (e.g. "en_es", "fr_en").
import starterWords from '../data/starter_words.json';

import { CEFR_LEVELS, getLevelsUpTo } from '../constants/cefrLevels';

/**
 * Bump this version string whenever the bundled word data or its filtering
 * logic changes in a way that requires a forced re-sync of the local cache.
 */
const WORD_DATA_VERSION = '6';

const PAGE_SIZE = 500;

/**
 * Defense-in-depth: reject entries that look like grammatical descriptions.
 * The JSON data files are pre-cleaned, so this should rarely trigger.
 */
const BAD_PATTERNS = [
  /\b(nominative|accusative|dative|genitive|ablative|vocative|instrumental|locative|inessive|illative|elative|superessive|sublative|delative|adessive|allative|translative|terminative|essive|causal-final|partitive)\b/i,
  /\b(first|second|third)[\s-]person\b/i,
  /\b(inflection|conjugation|declension|form|singular|plural)\s+of\b/i,
  /\bpast[\s-](tense|participle)\s+of\b/i,
  /\bpresent[\s-](tense|participle)\s+of\b/i,
  /\bcontraction\s+of\b/i,
  /\b(masculine|feminine|neuter)\b/i,
  /\binterrogative\b/i,
  /\bletter\b.*\balphabet\b/i,
];

const isBadEntry = (text) => {
  if (!text) return true;
  const t = text.trim();
  if (!t) return true;
  if (t.startsWith('[TRANSLATE') || t.startsWith('[NEED')) return true;
  if (t.length > 80) return true;
  for (const p of BAD_PATTERNS) {
    if (p.test(t)) return true;
  }
  return false;
};

/**
 * Strip parenthetical grammatical annotations from bundled word entries.
 *
 * Some data files (notably Hungarian) include entries of the form:
 *   "to be/(copulative) to be"
 *   "to hold/(transitive) to hold (to keep in one's hands)"
 *
 * These encode the same word twice — once clean and once with a grammar
 * label. We keep only the first, clean segment before the '/' that
 * introduces a parenthetical label.
 */
const GRAMMAR_SLASH_RE = /\/\s*\([^)]+\)/;
const cleanSourceWord = (text) => {
  if (!text) return text;
  // Only strip when the '/' is followed by a parenthetical grammar marker
  if (GRAMMAR_SLASH_RE.test(text)) {
    return text.split('/')[0].trim();
  }
  return text;
};

/**
 * Returns the bundled A1 starter dataset for a given language pair, or
 * null if no starter data is available for the pair.
 */
const getLocalDataForPair = (sourceLang, targetLang) => {
  return starterWords[`${sourceLang}_${targetLang}`] || null;
};

/**
 * Imports words from the A1 starter set into SQLite as a fallback when
 * the backend API is unreachable on first launch.
 */
const importFromLocalData = async (sourceLang, targetLang, cefrLevel) => {
  const data = getLocalDataForPair(sourceLang, targetLang);
  if (!data || data.length === 0) {
    console.log(`⚠️  No starter data for ${sourceLang}→${targetLang}`);
    return 0;
  }

  const allowedLevels = new Set(getLevelsUpTo(cefrLevel));

  // Clear existing words for this language pair
  await db.runAsync(
    'DELETE FROM words WHERE source_lang = ? AND target_lang = ?',
    [sourceLang, targetLang]
  );

  let imported = 0;
  const batchSize = 100;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await db.execAsync('BEGIN TRANSACTION');

    for (const w of batch) {
      const cleanedSource = cleanSourceWord(w.source_word);
      const cleanedTarget = cleanSourceWord(w.target_word);
      if (isBadEntry(cleanedSource) || isBadEntry(cleanedTarget)) {
        continue;
      }
      if (!allowedLevels.has(w.cefr_level)) {
        continue;
      }
      try {
        await db.runAsync(
          `INSERT OR REPLACE INTO words (id, word, translation, difficulty, category, frequency_rank, cefr_level, source_lang, target_lang)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            w.id,
            cleanedTarget,
            cleanedSource,
            w.difficulty,
            w.category,
            w.frequency_rank,
            w.cefr_level,
            w.source_lang || sourceLang,
            w.target_lang || targetLang,
          ]
        );
        imported++;
      } catch (err) {
        // skip individual insert errors
      }
    }
    await db.execAsync('COMMIT');
  }

  console.log(`📦 Imported ${imported.toLocaleString()} A1 starter words (${sourceLang}→${targetLang})`);
  return imported;
};

/**
 * Fetches words for the user's selected language pair and CEFR level
 * from the backend, then replaces the local words table content.
 *
 * Returns the number of words synced.
 */
export const syncWordsFromApi = async () => {
  const knownLanguage = (await AsyncStorage.getItem('knownLanguage')) || 'en';
  const learningLanguage = (await AsyncStorage.getItem('learningLanguage')) || 'es';
  const cefrLevel = (await AsyncStorage.getItem('cefrLevel')) || 'A1';

  let imported = 0;

  try {
    console.log(`📡 Fetching words from API: ${knownLanguage}→${learningLanguage} at ${cefrLevel}...`);

    // First get the total count so we know how many pages to fetch
    const countRes = await api.get('/words/count', {
      params: { source_lang: knownLanguage, target_lang: learningLanguage, cefr_level: cefrLevel },
    });
    const total = countRes.data.total;
    console.log(`   ${total.toLocaleString()} words available`);

    if (total === 0) {
      console.log('⚠️  No words on API for this pair, falling back to starter data...');
      imported = await importFromLocalData(knownLanguage, learningLanguage, cefrLevel);
    } else {
      // Clear existing words for this language pair (keep other pairs if any)
      await db.runAsync(
        'DELETE FROM words WHERE source_lang = ? AND target_lang = ?',
        [knownLanguage, learningLanguage]
      );

      // Fetch in pages
      for (let offset = 0; offset < total; offset += PAGE_SIZE) {
        const res = await api.get('/words', {
          params: {
            source_lang: knownLanguage,
            target_lang: learningLanguage,
            cefr_level: cefrLevel,
            limit: PAGE_SIZE,
            offset,
          },
        });

        const words = res.data.words;
        if (words.length === 0) break;

        await db.execAsync('BEGIN TRANSACTION');

        for (const w of words) {
          try {
            await db.runAsync(
              `INSERT OR REPLACE INTO words (id, word, translation, difficulty, category, frequency_rank, cefr_level, source_lang, target_lang)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [w.id, w.word, w.translation, w.difficulty, w.category, w.frequency_rank, w.cefr_level, w.source_lang, w.target_lang]
            );
            imported++;
          } catch (err) {
            console.error(`Error inserting word ${w.id}:`, err.message);
          }
        }

        await db.execAsync('COMMIT');
      }
    }
  } catch (apiError) {
    console.warn(`⚠️  API sync failed (${apiError.message}), falling back to starter data...`);
    imported = await importFromLocalData(knownLanguage, learningLanguage, cefrLevel);
  }

  // Save what we synced so we can skip re-syncing if nothing changed
  await AsyncStorage.setItem(
    'lastWordSync',
    JSON.stringify({ knownLanguage, learningLanguage, cefrLevel, dataVersion: WORD_DATA_VERSION, count: imported, syncedAt: new Date().toISOString() })
  );

  console.log(`✅ Synced ${imported.toLocaleString()} words to local database`);
  return imported;
};

/**
 * Checks whether a re-sync is needed (language/level changed since last sync).
 * Returns true if sync is needed.
 */
export const isSyncNeeded = async () => {
  const knownLanguage = (await AsyncStorage.getItem('knownLanguage')) || 'en';
  const learningLanguage = (await AsyncStorage.getItem('learningLanguage')) || 'es';
  const cefrLevel = (await AsyncStorage.getItem('cefrLevel')) || 'A1';

  const lastSync = await AsyncStorage.getItem('lastWordSync');
  if (!lastSync) return true;

  try {
    const parsed = JSON.parse(lastSync);
    return (
      parsed.knownLanguage !== knownLanguage ||
      parsed.learningLanguage !== learningLanguage ||
      parsed.cefrLevel !== cefrLevel ||
      parsed.dataVersion !== WORD_DATA_VERSION
    );
  } catch {
    return true;
  }
};

/**
 * Returns the word count currently cached locally for a language pair.
 */
export const getLocalWordCount = async (sourceLang, targetLang) => {
  const result = await db.getFirstAsync(
    'SELECT COUNT(*) as count FROM words WHERE source_lang = ? AND target_lang = ?',
    [sourceLang, targetLang]
  );
  return result?.count || 0;
};
