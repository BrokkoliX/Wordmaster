/**
 * Weak Area Detection Service
 *
 * Analyzes user progress to find CEFR levels and categories where the user
 * struggles, then generates focused review sessions for those areas.
 */

import db from './sqliteConnection';
import { getAccuracyByCefrLevel, getAccuracyByCategory } from './database';

const WEAK_ACCURACY_THRESHOLD = 70;
const MIN_WORDS_FOR_LEVEL = 5;
const CHRONIC_ERROR_THRESHOLD = 3;

/**
 * Detect weak areas across CEFR levels, categories, and individual words.
 * Returns an array sorted by weakness score (weakest first).
 */
export const detectWeakAreas = async () => {
  try {
    const weakAreas = [];

    // 1. CEFR level analysis
    const cefrStats = await getAccuracyByCefrLevel();
    for (const row of cefrStats) {
      if (row.accuracy < WEAK_ACCURACY_THRESHOLD && row.total_words >= MIN_WORDS_FOR_LEVEL) {
        const score = (1 - row.accuracy / 100) * Math.log2(row.total_words + 1);
        weakAreas.push({
          type: 'cefr_level',
          label: row.cefr_level,
          accuracy: row.accuracy,
          wordCount: row.total_words,
          mastered: row.mastered,
          score,
          suggestion: `You're struggling with ${row.cefr_level} words (${row.accuracy}% accuracy) -- practice recommended`,
        });
      }
    }

    // 2. Category analysis
    const categoryStats = await getAccuracyByCategory();
    for (const row of categoryStats) {
      if (row.accuracy < WEAK_ACCURACY_THRESHOLD && row.total_words >= 3) {
        const score = (1 - row.accuracy / 100) * Math.log2(row.total_words + 1);
        weakAreas.push({
          type: 'category',
          label: row.category,
          displayName: row.category_name || row.category,
          icon: row.category_icon || '📁',
          accuracy: row.accuracy,
          wordCount: row.total_words,
          mastered: row.mastered,
          score,
          suggestion: `${row.category_icon || ''} ${row.category_name || row.category} needs work (${row.accuracy}% accuracy)`,
        });
      }
    }

    // 3. Chronically difficult individual words
    const hardWords = await db.getAllAsync(`
      SELECT w.id, w.word, w.translation, w.category, w.cefr_level,
             p.times_incorrect, p.times_shown, p.times_correct,
             CASE WHEN p.times_shown > 0
               THEN ROUND((p.times_correct * 100.0 / p.times_shown), 1)
               ELSE 0
             END as accuracy
      FROM words w
      INNER JOIN user_word_progress p ON w.id = p.word_id
      WHERE p.times_incorrect >= ?
        AND p.times_shown > 0
        AND (p.times_correct * 100.0 / p.times_shown) < 50
      ORDER BY p.times_incorrect DESC
      LIMIT 10
    `, [CHRONIC_ERROR_THRESHOLD]);

    for (const word of hardWords) {
      weakAreas.push({
        type: 'word',
        label: word.word,
        wordId: word.id,
        translation: word.translation,
        accuracy: word.accuracy,
        wordCount: 1,
        timesIncorrect: word.times_incorrect,
        score: (1 - word.accuracy / 100) * 2,
        suggestion: `"${word.word}" is chronically difficult (${word.times_incorrect} errors)`,
      });
    }

    // Sort by score descending (worst areas first)
    weakAreas.sort((a, b) => b.score - a.score);

    return weakAreas;
  } catch (error) {
    console.error('Error detecting weak areas:', error);
    return [];
  }
};

/**
 * Generate a practice session for a specific weak area.
 * Returns words in the same shape as getWordsDueForReview.
 */
export const generateWeakAreaSession = async (weakArea, limit = 20) => {
  try {
    let words = [];

    if (weakArea.type === 'cefr_level') {
      words = await db.getAllAsync(`
        SELECT w.*, p.id as progress_id, p.status, p.confidence_level,
               p.consecutive_correct, p.ease_factor, p.interval_days,
               p.times_shown, p.times_correct, p.times_incorrect
        FROM words w
        INNER JOIN user_word_progress p ON w.id = p.word_id
        WHERE w.cefr_level = ?
          AND p.times_shown > 0
        ORDER BY
          CASE WHEN p.times_shown > 0
            THEN (p.times_correct * 1.0 / p.times_shown)
            ELSE 1
          END ASC,
          p.times_incorrect DESC
        LIMIT ?
      `, [weakArea.label, limit]);
    } else if (weakArea.type === 'category') {
      words = await db.getAllAsync(`
        SELECT w.*, p.id as progress_id, p.status, p.confidence_level,
               p.consecutive_correct, p.ease_factor, p.interval_days,
               p.times_shown, p.times_correct, p.times_incorrect
        FROM words w
        INNER JOIN user_word_progress p ON w.id = p.word_id
        WHERE w.category = ?
          AND p.times_shown > 0
        ORDER BY
          CASE WHEN p.times_shown > 0
            THEN (p.times_correct * 1.0 / p.times_shown)
            ELSE 1
          END ASC,
          p.times_incorrect DESC
        LIMIT ?
      `, [weakArea.label, limit]);
    } else if (weakArea.type === 'word') {
      words = await db.getAllAsync(`
        SELECT w.*, p.id as progress_id, p.status, p.confidence_level,
               p.consecutive_correct, p.ease_factor, p.interval_days,
               p.times_shown, p.times_correct, p.times_incorrect
        FROM words w
        INNER JOIN user_word_progress p ON w.id = p.word_id
        WHERE w.id = ?
      `, [weakArea.wordId]);
    }

    return words;
  } catch (error) {
    console.error('Error generating weak area session:', error);
    return [];
  }
};

/**
 * Get the single most impactful weak area as a human-readable suggestion.
 * Returns null if no weak areas detected.
 */
export const getWeakAreaSuggestion = async () => {
  try {
    const weakAreas = await detectWeakAreas();
    if (weakAreas.length === 0) return null;

    // Return the top-scored weak area (skip individual words for the banner)
    const topArea = weakAreas.find(a => a.type !== 'word') || weakAreas[0];
    return topArea;
  } catch (error) {
    console.error('Error getting weak area suggestion:', error);
    return null;
  }
};

export default {
  detectWeakAreas,
  generateWeakAreaSession,
  getWeakAreaSuggestion,
};
