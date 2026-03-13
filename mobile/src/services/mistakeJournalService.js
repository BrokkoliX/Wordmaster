/**
 * Mistake Journal Service
 *
 * Provides read-only views over existing user_word_progress data to surface
 * words the user struggles with and generate focused review sessions.
 */

import db from './sqliteConnection';

/**
 * Get words the user has answered incorrectly, ordered by error rate.
 */
export const getMistakes = async (limit = 50) => {
  try {
    const words = await db.getAllAsync(`
      SELECT w.id, w.word, w.translation, w.category, w.cefr_level,
             w.source_lang, w.target_lang,
             p.times_incorrect, p.times_correct, p.times_shown,
             p.status, p.confidence_level, p.consecutive_correct,
             p.last_reviewed_at,
             CASE WHEN p.times_shown > 0
               THEN ROUND((p.times_incorrect * 100.0 / p.times_shown), 1)
               ELSE 0
             END as error_rate,
             CASE WHEN p.times_shown > 0
               THEN ROUND((p.times_correct * 100.0 / p.times_shown), 1)
               ELSE 0
             END as accuracy
      FROM words w
      INNER JOIN user_word_progress p ON w.id = p.word_id
      WHERE p.times_incorrect > 0
      ORDER BY error_rate DESC, p.times_incorrect DESC
      LIMIT ?
    `, [limit]);
    return words;
  } catch (error) {
    console.error('Error getting mistakes:', error);
    return [];
  }
};

/**
 * Get aggregate summary of the user's mistakes.
 */
export const getMistakeSummary = async () => {
  try {
    const summary = await db.getFirstAsync(`
      SELECT
        COUNT(*) as total_mistake_words,
        SUM(p.times_incorrect) as total_incorrect_answers,
        ROUND(AVG(
          CASE WHEN p.times_shown > 0
            THEN (p.times_incorrect * 100.0 / p.times_shown)
            ELSE 0
          END
        ), 1) as avg_error_rate
      FROM user_word_progress p
      WHERE p.times_incorrect > 0
    `);

    // Most common error category
    const worstCategory = await db.getFirstAsync(`
      SELECT w.category, c.name as category_name, c.icon as category_icon,
             SUM(p.times_incorrect) as category_errors
      FROM words w
      INNER JOIN user_word_progress p ON w.id = p.word_id
      LEFT JOIN categories c ON w.category = c.id
      WHERE p.times_incorrect > 0
      GROUP BY w.category
      ORDER BY category_errors DESC
      LIMIT 1
    `);

    // Most common error CEFR level
    const worstLevel = await db.getFirstAsync(`
      SELECT w.cefr_level,
             SUM(p.times_incorrect) as level_errors
      FROM words w
      INNER JOIN user_word_progress p ON w.id = p.word_id
      WHERE p.times_incorrect > 0
      GROUP BY w.cefr_level
      ORDER BY level_errors DESC
      LIMIT 1
    `);

    return {
      totalMistakeWords: summary?.total_mistake_words || 0,
      totalIncorrectAnswers: summary?.total_incorrect_answers || 0,
      avgErrorRate: summary?.avg_error_rate || 0,
      worstCategory: worstCategory ? {
        id: worstCategory.category,
        name: worstCategory.category_name,
        icon: worstCategory.category_icon,
        errors: worstCategory.category_errors,
      } : null,
      worstLevel: worstLevel ? {
        level: worstLevel.cefr_level,
        errors: worstLevel.level_errors,
      } : null,
    };
  } catch (error) {
    console.error('Error getting mistake summary:', error);
    return {
      totalMistakeWords: 0,
      totalIncorrectAnswers: 0,
      avgErrorRate: 0,
      worstCategory: null,
      worstLevel: null,
    };
  }
};

/**
 * Get a review session built from the user's most-missed words.
 * Returns words in the same shape as getWordsDueForReview so existing
 * learning screens consume them without changes.
 */
export const getReviewSessionFromMistakes = async (limit = 20) => {
  try {
    const words = await db.getAllAsync(`
      SELECT w.*, p.id as progress_id, p.status, p.confidence_level,
             p.consecutive_correct, p.ease_factor, p.interval_days,
             p.times_shown, p.times_correct, p.times_incorrect
      FROM words w
      INNER JOIN user_word_progress p ON w.id = p.word_id
      WHERE p.times_incorrect > 0
      ORDER BY
        CASE WHEN p.times_shown > 0
          THEN (p.times_incorrect * 1.0 / p.times_shown)
          ELSE 0
        END DESC,
        p.times_incorrect DESC
      LIMIT ?
    `, [limit]);
    return words;
  } catch (error) {
    console.error('Error getting mistake review session:', error);
    return [];
  }
};

export default {
  getMistakes,
  getMistakeSummary,
  getReviewSessionFromMistakes,
};
