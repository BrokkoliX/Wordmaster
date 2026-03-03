/**
 * Fetches sentence templates from the backend API and caches them in local
 * SQLite. Falls back to bundled JSON data when the API is unreachable.
 *
 * Follows the same sync pattern as wordApiService.js.
 */

import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import db from './db';

// Bundled JSON data for offline/fallback use
import sentencesDe from '../data/sentences_de.json';
import sentencesFr from '../data/sentences_fr.json';
import sentencesEs from '../data/sentences_es.json';
import sentencesHu from '../data/sentences_hu.json';

import { getLevelsUpTo } from '../constants/cefrLevels';

const PAGE_SIZE = 200;

const getLocalSentences = (language) => {
  const map = { de: sentencesDe, fr: sentencesFr, es: sentencesEs, hu: sentencesHu };
  return map[language] || null;
};

/**
 * Creates the sentence_templates table in local SQLite if it doesn't exist.
 */
export const initSentenceTable = async () => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sentence_templates (
      id TEXT PRIMARY KEY,
      language TEXT NOT NULL,
      cefr_level TEXT NOT NULL,
      sentence TEXT NOT NULL,
      answer TEXT NOT NULL,
      answer_word_id TEXT,
      distractors TEXT,
      hint TEXT,
      grammar_topic TEXT,
      difficulty INTEGER DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_st_lang ON sentence_templates(language);
    CREATE INDEX IF NOT EXISTS idx_st_lang_level ON sentence_templates(language, cefr_level);
  `);
};

/**
 * Import from bundled JSON when the API is unreachable.
 */
const importFromLocalData = async (language, cefrLevel) => {
  const data = getLocalSentences(language);
  if (!data || data.length === 0) {
    console.log(`⚠️  No bundled sentence data for ${language}`);
    return 0;
  }

  const allowedLevels = new Set(getLevelsUpTo(cefrLevel));

  await db.runAsync('DELETE FROM sentence_templates WHERE language = ?', [language]);

  let imported = 0;
  await db.execAsync('BEGIN TRANSACTION');

  for (const s of data) {
    if (!allowedLevels.has(s.cefr_level)) continue;
    try {
      await db.runAsync(
        `INSERT OR REPLACE INTO sentence_templates
         (id, language, cefr_level, sentence, answer, answer_word_id, distractors, hint, grammar_topic, difficulty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          s.id,
          s.language,
          s.cefr_level,
          s.sentence,
          s.answer,
          s.answer_word_id || null,
          JSON.stringify(s.distractors || []),
          s.hint || null,
          s.grammar_topic || null,
          s.difficulty || 1,
        ]
      );
      imported++;
    } catch (err) {
      // skip individual insert errors
    }
  }

  await db.execAsync('COMMIT');
  console.log(`📦 Imported ${imported} sentence templates from bundled data (${language})`);
  return imported;
};

/**
 * Sync sentence templates for the user's learning language.
 * Tries the backend API first, falls back to bundled JSON.
 */
export const syncSentencesFromApi = async () => {
  const learningLanguage = (await AsyncStorage.getItem('learningLanguage')) || 'es';
  const cefrLevel = (await AsyncStorage.getItem('cefrLevel')) || 'A1';

  await initSentenceTable();

  let imported = 0;

  try {
    console.log(`📡 Fetching sentences from API: ${learningLanguage} at ${cefrLevel}...`);

    const countRes = await api.get('/sentences/count', {
      params: { language: learningLanguage, cefr_level: cefrLevel },
    });
    const total = countRes.data.total;
    console.log(`   ${total} sentence templates available`);

    if (total === 0) {
      console.log('⚠️  No sentences on API, falling back to bundled data...');
      imported = await importFromLocalData(learningLanguage, cefrLevel);
    } else {
      await db.runAsync(
        'DELETE FROM sentence_templates WHERE language = ?',
        [learningLanguage]
      );

      for (let offset = 0; offset < total; offset += PAGE_SIZE) {
        const res = await api.get('/sentences', {
          params: {
            language: learningLanguage,
            cefr_level: cefrLevel,
            limit: PAGE_SIZE,
            offset,
          },
        });

        const sentences = res.data.sentences;
        if (sentences.length === 0) break;

        await db.execAsync('BEGIN TRANSACTION');

        for (const s of sentences) {
          try {
            await db.runAsync(
              `INSERT OR REPLACE INTO sentence_templates
               (id, language, cefr_level, sentence, answer, answer_word_id, distractors, hint, grammar_topic, difficulty)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                s.id, s.language, s.cefr_level, s.sentence, s.answer,
                s.answer_word_id || null,
                typeof s.distractors === 'string' ? s.distractors : JSON.stringify(s.distractors || []),
                s.hint || null, s.grammar_topic || null, s.difficulty || 1,
              ]
            );
            imported++;
          } catch (err) {
            console.error(`Error inserting sentence ${s.id}:`, err.message);
          }
        }

        await db.execAsync('COMMIT');
      }
    }
  } catch (apiError) {
    console.warn(`⚠️  Sentence API sync failed (${apiError.message}), falling back to bundled data...`);
    imported = await importFromLocalData(learningLanguage, cefrLevel);
  }

  await AsyncStorage.setItem(
    'lastSentenceSync',
    JSON.stringify({ learningLanguage, cefrLevel, count: imported, syncedAt: new Date().toISOString() })
  );

  console.log(`✅ Synced ${imported} sentence templates to local database`);
  return imported;
};

/**
 * Check if sentence sync is needed (language/level changed).
 */
export const isSentenceSyncNeeded = async () => {
  const learningLanguage = (await AsyncStorage.getItem('learningLanguage')) || 'es';
  const cefrLevel = (await AsyncStorage.getItem('cefrLevel')) || 'A1';

  const lastSync = await AsyncStorage.getItem('lastSentenceSync');
  if (!lastSync) return true;

  try {
    const parsed = JSON.parse(lastSync);
    return parsed.learningLanguage !== learningLanguage || parsed.cefrLevel !== cefrLevel;
  } catch {
    return true;
  }
};

/**
 * Get sentence templates from local SQLite for the current language,
 * optionally filtered by grammar topic. Returns shuffled results.
 */
export const getLocalSentenceTemplates = async (limit = 20, topic = null) => {
  const learningLanguage = (await AsyncStorage.getItem('learningLanguage')) || 'es';

  let query = `SELECT * FROM sentence_templates WHERE language = ?`;
  const params = [learningLanguage];

  if (topic) {
    query += ` AND grammar_topic = ?`;
    params.push(topic);
  }

  query += ` ORDER BY RANDOM() LIMIT ?`;
  params.push(limit);

  return db.getAllAsync(query, params);
};

/**
 * Get available grammar topics for the current language.
 */
export const getAvailableTopics = async () => {
  const learningLanguage = (await AsyncStorage.getItem('learningLanguage')) || 'es';

  return db.getAllAsync(
    `SELECT grammar_topic, COUNT(*) as count
     FROM sentence_templates
     WHERE language = ?
     GROUP BY grammar_topic
     ORDER BY count DESC`,
    [learningLanguage]
  );
};
