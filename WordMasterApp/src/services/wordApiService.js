/**
 * Fetches words from the backend API and caches them in local SQLite.
 *
 * The backend holds all 210k+ words across every language pair and level.
 * This service downloads only the subset the user needs (one language pair
 * at one CEFR level and below) and stores it locally so the existing
 * SQLite-based learning queries continue to work unchanged.
 */

import * as SQLite from 'expo-sqlite';
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DB_NAME = 'wordmaster.db';
const db = SQLite.openDatabaseSync(DB_NAME);

const PAGE_SIZE = 500;

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

  console.log(`📡 Fetching words from API: ${knownLanguage}→${learningLanguage} at ${cefrLevel}...`);

  // First get the total count so we know how many pages to fetch
  const countRes = await api.get('/words/count', {
    params: { source_lang: knownLanguage, target_lang: learningLanguage, cefr_level: cefrLevel },
  });
  const total = countRes.data.total;
  console.log(`   ${total.toLocaleString()} words available`);

  if (total === 0) {
    console.log('⚠️  No words found for this language pair and level');
    return 0;
  }

  // Clear existing words for this language pair (keep other pairs if any)
  await db.execAsync(
    `DELETE FROM words WHERE source_lang = '${knownLanguage}' AND target_lang = '${learningLanguage}'`
  );

  let imported = 0;

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
