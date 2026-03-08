const { query, transaction } = require('../config/database');

class ProgressModel {
  /**
   * Sync user progress (batch upsert word progress)
   *
   * Uses UNNEST to insert/update all records in a single query instead of
   * looping row-by-row, keeping connection hold time to O(1).
   */
  static async syncWordProgress(userId, progressData) {
    if (!progressData || progressData.length === 0) {
      return [];
    }

    // Build parallel arrays for UNNEST
    const wordIds = [];
    const statuses = [];
    const confidenceLevels = [];
    const consecutiveCorrects = [];
    const easeFactors = [];
    const intervalDays = [];
    const nextReviewDates = [];
    const timesShowns = [];
    const timesCorrects = [];
    const timesIncorrects = [];
    const lastRevieweds = [];

    for (const item of progressData) {
      wordIds.push(item.wordId);
      statuses.push(item.status);
      confidenceLevels.push(item.confidenceLevel);
      consecutiveCorrects.push(item.consecutiveCorrect);
      easeFactors.push(item.easeFactor);
      intervalDays.push(item.intervalDays);
      nextReviewDates.push(item.nextReviewDate);
      timesShowns.push(item.timesShown);
      timesCorrects.push(item.timesCorrect);
      timesIncorrects.push(item.timesIncorrect);
      lastRevieweds.push(item.lastReviewed);
    }

    const result = await query(
      `INSERT INTO user_word_progress (
        user_id, word_id, status, confidence_level, consecutive_correct,
        ease_factor, interval_days, next_review_date, times_shown,
        times_correct, times_incorrect, last_reviewed
      )
      SELECT
        $1,
        unnest($2::text[]),
        unnest($3::text[]),
        unnest($4::int[]),
        unnest($5::int[]),
        unnest($6::real[]),
        unnest($7::int[]),
        unnest($8::text[]),
        unnest($9::int[]),
        unnest($10::int[]),
        unnest($11::int[]),
        unnest($12::text[])
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
        wordIds,
        statuses,
        confidenceLevels,
        consecutiveCorrects,
        easeFactors,
        intervalDays,
        nextReviewDates,
        timesShowns,
        timesCorrects,
        timesIncorrects,
        lastRevieweds,
      ]
    );

    return result.rows;
  }

  /**
   * Create a single learning session
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
   * Batch-insert multiple learning sessions in a single query.
   *
   * Replaces the row-by-row loop in the sync controller, keeping the
   * connection hold time O(1) regardless of how many sessions are synced.
   */
  static async batchCreateSessions(userId, sessionsData) {
    if (!sessionsData || sessionsData.length === 0) return [];

    const startTimes = [];
    const endTimes = [];
    const wordsRevieweds = [];
    const correctAnswersList = [];
    const accuracies = [];
    const sessionDatas = [];

    for (const s of sessionsData) {
      startTimes.push(s.startTime);
      endTimes.push(s.endTime);
      wordsRevieweds.push(s.wordsReviewed);
      correctAnswersList.push(s.correctAnswers);
      accuracies.push(s.accuracy);
      sessionDatas.push(JSON.stringify(s.data || {}));
    }

    const result = await query(
      `INSERT INTO learning_sessions (
        user_id, start_time, end_time, words_reviewed,
        correct_answers, accuracy, session_data
      )
      SELECT
        $1,
        unnest($2::timestamptz[]),
        unnest($3::timestamptz[]),
        unnest($4::int[]),
        unnest($5::int[]),
        unnest($6::real[]),
        unnest($7::text[])
      RETURNING *`,
      [userId, startTimes, endTimes, wordsRevieweds, correctAnswersList, accuracies, sessionDatas]
    );

    return result.rows;
  }

  /**
   * Unlock a single achievement
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
   * Batch-upsert multiple achievements in a single query.
   *
   * Replaces the row-by-row loop in the sync controller.
   */
  static async batchUnlockAchievements(userId, achievementsData) {
    if (!achievementsData || achievementsData.length === 0) return [];

    const achievementIds = achievementsData.map((a) => a.achievementId);
    const progresses = achievementsData.map((a) => a.progress ?? 100);

    const result = await query(
      `INSERT INTO user_achievements (user_id, achievement_id, progress)
       SELECT $1, unnest($2::text[]), unnest($3::int[])
       ON CONFLICT (user_id, achievement_id)
       DO UPDATE SET progress = EXCLUDED.progress, unlocked_at = NOW()
       RETURNING *`,
      [userId, achievementIds, progresses]
    );

    return result.rows;
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
