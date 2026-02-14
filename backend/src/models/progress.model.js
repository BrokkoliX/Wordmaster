const { query, transaction } = require('../config/database');

class ProgressModel {
  /**
   * Sync user progress (upsert word progress)
   */
  static async syncWordProgress(userId, progressData) {
    const results = await transaction(async (client) => {
      const synced = [];

      for (const item of progressData) {
        const result = await client.query(
          `INSERT INTO user_word_progress (
            user_id, word_id, status, confidence_level, consecutive_correct,
            ease_factor, interval_days, next_review_date, times_shown,
            times_correct, times_incorrect, last_reviewed
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          ON CONFLICT (user_id, word_id) 
          DO UPDATE SET
            status = EXCLUDED.status,
            confidence_level = EXCLUDED.confidence_level,
            consecutive_correct = EXCLUDED.consecutive_correct,
            ease_factor = EXCLUDED.ease_factor,
            interval_days = EXCLUDED.interval_days,
            next_review_date = EXCLUDED.next_review_date,
            times_shown = EXCLUDED.times_shown,
            times_correct = EXCLUDED.times_correct,
            times_incorrect = EXCLUDED.times_incorrect,
            last_reviewed = EXCLUDED.last_reviewed,
            updated_at = NOW()
          RETURNING *`,
          [
            userId,
            item.wordId,
            item.status,
            item.confidenceLevel,
            item.consecutiveCorrect,
            item.easeFactor,
            item.intervalDays,
            item.nextReviewDate,
            item.timesShown,
            item.timesCorrect,
            item.timesIncorrect,
            item.lastReviewed,
          ]
        );

        synced.push(result.rows[0]);
      }

      return synced;
    });

    return results;
  }

  /**
   * Create learning session
   */
  static async createSession(userId, sessionData) {
    const result = await query(
      `INSERT INTO learning_sessions (
        user_id, start_time, end_time, words_reviewed,
        correct_answers, accuracy, session_data
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        userId,
        sessionData.startTime,
        sessionData.endTime,
        sessionData.wordsReviewed,
        sessionData.correctAnswers,
        sessionData.accuracy,
        JSON.stringify(sessionData.data || {}),
      ]
    );

    return result.rows[0];
  }

  /**
   * Unlock achievement
   */
  static async unlockAchievement(userId, achievementId, progress = 100) {
    const result = await query(
      `INSERT INTO user_achievements (user_id, achievement_id, progress)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, achievement_id)
       DO UPDATE SET progress = EXCLUDED.progress, unlocked_at = NOW()
       RETURNING *`,
      [userId, achievementId, progress]
    );

    return result.rows[0];
  }

  /**
   * Get user statistics
   */
  static async getStats(userId) {
    // Word progress stats
    const progressStats = await query(
      `SELECT 
        COUNT(*) as total_words,
        COUNT(*) FILTER (WHERE status = 'mastered') as words_mastered,
        COUNT(*) FILTER (WHERE status = 'learning') as words_learning,
        AVG(confidence_level) as avg_confidence
       FROM user_word_progress
       WHERE user_id = $1`,
      [userId]
    );

    // Session stats
    const sessionStats = await query(
      `SELECT 
        COUNT(*) as total_sessions,
        SUM(words_reviewed) as total_words_reviewed,
        SUM(correct_answers) as total_correct,
        AVG(accuracy) as avg_accuracy
       FROM learning_sessions
       WHERE user_id = $1`,
      [userId]
    );

    // Achievement stats
    const achievementStats = await query(
      `SELECT COUNT(*) as unlocked_achievements
       FROM user_achievements
       WHERE user_id = $1 AND progress >= 100`,
      [userId]
    );

    // Streak calculation (consecutive days with sessions)
    const streakResult = await query(
      `WITH daily_sessions AS (
        SELECT DATE(start_time) as session_date
        FROM learning_sessions
        WHERE user_id = $1
        GROUP BY DATE(start_time)
        ORDER BY DATE(start_time) DESC
      ),
      streak_calc AS (
        SELECT 
          session_date,
          session_date - ROW_NUMBER() OVER (ORDER BY session_date DESC)::int as streak_group
        FROM daily_sessions
      )
      SELECT COUNT(*) as current_streak
      FROM streak_calc
      WHERE streak_group = (SELECT MAX(streak_group) FROM streak_calc)
        AND session_date >= CURRENT_DATE - INTERVAL '1 day'`,
      [userId]
    );

    return {
      wordProgress: progressStats.rows[0],
      sessions: sessionStats.rows[0],
      achievements: achievementStats.rows[0],
      currentStreak: parseInt(streakResult.rows[0]?.current_streak || 0),
    };
  }

  /**
   * Get all user progress for export
   */
  static async getAllProgress(userId) {
    const progress = await query(
      'SELECT * FROM user_word_progress WHERE user_id = $1',
      [userId]
    );

    const sessions = await query(
      'SELECT * FROM learning_sessions WHERE user_id = $1 ORDER BY start_time DESC LIMIT 100',
      [userId]
    );

    const achievements = await query(
      'SELECT * FROM user_achievements WHERE user_id = $1',
      [userId]
    );

    return {
      progress: progress.rows,
      sessions: sessions.rows,
      achievements: achievements.rows,
    };
  }

  /**
   * Get user settings
   */
  static async getSettings(userId) {
    const result = await query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [userId]
    );

    return result.rows[0];
  }

  /**
   * Update or create user settings
   */
  static async updateSettings(userId, settings) {
    const result = await query(
      `INSERT INTO user_settings (
        user_id, cefr_level, known_language, learning_language,
        tts_enabled, tts_rate, daily_goal, notifications_enabled, theme
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id)
      DO UPDATE SET
        cefr_level = EXCLUDED.cefr_level,
        known_language = EXCLUDED.known_language,
        learning_language = EXCLUDED.learning_language,
        tts_enabled = EXCLUDED.tts_enabled,
        tts_rate = EXCLUDED.tts_rate,
        daily_goal = EXCLUDED.daily_goal,
        notifications_enabled = EXCLUDED.notifications_enabled,
        theme = EXCLUDED.theme,
        updated_at = NOW()
      RETURNING *`,
      [
        userId,
        settings.cefrLevel,
        settings.knownLanguage,
        settings.learningLanguage,
        settings.ttsEnabled,
        settings.ttsRate,
        settings.dailyGoal,
        settings.notificationsEnabled,
        settings.theme,
      ]
    );

    return result.rows[0];
  }
}

module.exports = ProgressModel;
