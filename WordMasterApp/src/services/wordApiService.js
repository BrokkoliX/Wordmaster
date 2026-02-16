/**
 * Fetches words from the backend API and caches them in local SQLite.
 *
 * The backend holds all 210k+ words across every language pair and level.
 * This service downloads only the subset the user needs (one language pair
 * at one CEFR level and below) and stores it locally so the existing
 * SQLite-based learning queries continue to work unchanged.
 *
 * When the API is unreachable, falls back to bundled JSON data files.
 */

import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import db from './db';

// Bundled JSON data for offline/fallback use
import wordsEnToEs from '../data/words_translated.json';
import wordsEnToFr from '../data/words_french.json';
import wordsEnToDe from '../data/words_german.json';
import wordsEnToHu from '../data/words_hungarian.json';
import wordsEsToEn from '../data/words_spanish_to_english.json';
import wordsFrToEn from '../data/words_french_to_english.json';
import wordsDeToEn from '../data/words_german_to_english.json';
import wordsHuToEn from '../data/words_hungarian_to_english.json';

const PAGE_SIZE = 500;
const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

/**
 * Returns the bundled JSON dataset for a given language pair, or null if
 * no local data is available.
 */
const getLocalDataForPair = (sourceLang, targetLang) => {
  const key = `${sourceLang}_${targetLang}`;
  const map = {
    en_es: wordsEnToEs,
    en_fr: wordsEnToFr,
    en_de: wordsEnToDe,
    en_hu: wordsEnToHu,
    es_en: wordsEsToEn,
    fr_en: wordsFrToEn,
    de_en: wordsDeToEn,
    hu_en: wordsHuToEn,
  };
  return map[key] || null;
};

/**
 * Imports words from the bundled JSON data into SQLite as a fallback when
 * the backend API is unreachable.
 */
const importFromLocalData = async (sourceLang, targetLang, cefrLevel) => {
  const data = getLocalDataForPair(sourceLang, targetLang);
  if (!data || data.length === 0) {
    console.log(`⚠️  No bundled data for ${sourceLang}→${targetLang}`);
    return 0;
  }

  const levelIndex = CEFR_ORDER.indexOf(cefrLevel);
  const allowedLevels = new Set(CEFR_ORDER.slice(0, levelIndex + 1));

  // Clear existing words for this language pair
  await db.execAsync(
    `DELETE FROM words WHERE source_lang = '${sourceLang}' AND target_lang = '${targetLang}'`
  );

  let imported = 0;
  const batchSize = 100;

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await db.execAsync('BEGIN TRANSACTION');

    for (const w of batch) {
      if (!w.source_word || w.source_word.trim() === '' || w.source_word.startsWith('[TRANSLATE')) {
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
            w.target_word,
            w.source_word,
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

  console.log(`📦 Imported ${imported.toLocaleString()} words from bundled data (${sourceLang}→${targetLang})`);
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
      console.log('⚠️  No words on API for this pair, falling back to bundled data...');
      imported = await importFromLocalData(knownLanguage, learningLanguage, cefrLevel);
    } else {
      // Clear existing words for this language pair (keep other pairs if any)
      await db.execAsync(
        `DELETE FROM words WHERE source_lang = '${knownLanguage}' AND target_lang = '${learningLanguage}'`
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
    console.warn(`⚠️  API sync failed (${apiError.message}), falling back to bundled data...`);
    imported = await importFromLocalData(knownLanguage, learningLanguage, cefrLevel);
  }

  // Save what we synced so we can skip re-syncing if nothing changed
  await AsyncStorage.setItem(
    'lastWordSync',
    JSON.stringify({ knownLanguage, learningLanguage, cefrLevel, count: imported, syncedAt: new Date().toISOString() })
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
      parsed.cefrLevel !== cefrLevel
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

export default { syncWordsFromApi, isSyncNeeded, getLocalWordCount };
