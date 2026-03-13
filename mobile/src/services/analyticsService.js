/**
 * Analytics Service
 *
 * Computes detailed progress analytics from existing local data.
 * No new data collection needed -- everything comes from user_word_progress
 * and sessions tables.
 */

import db from './sqliteConnection';
import {
  getAccuracyByCefrLevel,
  getAccuracyByCategory,
  getDailyReviewCounts,
  getWordProgressDistribution,
} from './database';

/**
 * Get weekly stats for the last N weeks.
 */
export const getWeeklyStats = async (weeksBack = 4) => {
  try {
    const days = weeksBack * 7;
    const rows = await db.getAllAsync(`
      SELECT
        strftime('%Y-W%W', completed_at) as week,
        MIN(DATE(completed_at)) as week_start,
        COUNT(*) as sessions,
        SUM(words_reviewed) as words_reviewed,
        SUM(correct_answers) as correct_answers,
        ROUND(AVG(accuracy), 1) as avg_accuracy
      FROM sessions
      WHERE completed_at IS NOT NULL
        AND DATE(completed_at) >= DATE('now', '-' || ? || ' days')
      GROUP BY strftime('%Y-W%W', completed_at)
      ORDER BY week ASC
    `, [days]);
    return rows;
  } catch (error) {
    console.error('Error getting weekly stats:', error);
    return [];
  }
};

/**
 * Get daily stats for the last N days.
 */
export const getDailyStats = async (daysBack = 30) => {
  return getDailyReviewCounts(daysBack);
};

/**
 * Get accuracy trend with a 3-day rolling average.
 */
export const getAccuracyTrend = async (daysBack = 30) => {
  try {
    const dailyData = await getDailyReviewCounts(daysBack);
    if (dailyData.length === 0) return [];

    // Compute 3-day rolling average
    const trend = dailyData.map((day, i) => {
      const windowStart = Math.max(0, i - 2);
      const window = dailyData.slice(windowStart, i + 1);
      const avgAccuracy = window.reduce((sum, d) => sum + (d.avg_accuracy || 0), 0) / window.length;
      return {
        date: day.date,
        accuracy: Math.round(avgAccuracy * 10) / 10,
        rawAccuracy: day.avg_accuracy || 0,
      };
    });
    return trend;
  } catch (error) {
    console.error('Error getting accuracy trend:', error);
    return [];
  }
};

/**
 * Get CEFR level progress breakdown.
 */
export const getCefrLevelProgress = async () => {
  return getAccuracyByCefrLevel();
};

/**
 * Get category performance breakdown.
 */
export const getCategoryPerformance = async () => {
  return getAccuracyByCategory();
};

/**
 * Get review vs. new words ratio over time.
 */
export const getReviewVsNewRatio = async (daysBack = 30) => {
  try {
    const dailyData = await getDailyReviewCounts(daysBack);
    return dailyData.map((day) => ({
      date: day.date,
      reviewed: (day.words_reviewed || 0) - (day.new_words || 0),
      newWords: day.new_words || 0,
    }));
  } catch (error) {
    console.error('Error getting review vs new ratio:', error);
    return [];
  }
};

/**
 * Get word progress distribution.
 */
export const getProgressDistribution = async () => {
  return getWordProgressDistribution();
};

/**
 * Estimate learning velocity: words mastered per day and days to next level.
 */
export const getLearningVelocity = async () => {
  try {
    // Words mastered in the last 7 days
    const recent = await db.getFirstAsync(`
      SELECT COUNT(*) as count
      FROM user_word_progress
      WHERE (status = 'mastered' OR status = 'retired')
        AND last_reviewed_at >= datetime('now', '-7 days')
    `);

    const wordsPerDay = Math.round(((recent?.count || 0) / 7) * 10) / 10;

    // Total mastered
    const totalMastered = await db.getFirstAsync(`
      SELECT COUNT(*) as count
      FROM user_word_progress
      WHERE status = 'mastered' OR status = 'retired'
    `);

    // Total available words at current level
    const totalAvailable = await db.getFirstAsync(
      'SELECT COUNT(*) as count FROM words'
    );

    const remaining = (totalAvailable?.count || 0) - (totalMastered?.count || 0);
    const estimatedDays = wordsPerDay > 0 ? Math.ceil(remaining / wordsPerDay) : null;

    return {
      wordsPerDay,
      totalMastered: totalMastered?.count || 0,
      totalAvailable: totalAvailable?.count || 0,
      remaining,
      estimatedDays,
    };
  } catch (error) {
    console.error('Error getting learning velocity:', error);
    return { wordsPerDay: 0, totalMastered: 0, totalAvailable: 0, remaining: 0, estimatedDays: null };
  }
};

/**
 * Get a comprehensive analytics snapshot for the main screen.
 */
export const getAnalyticsSnapshot = async () => {
  try {
    const [
      weeklyStats,
      accuracyTrend,
      cefrProgress,
      categoryPerformance,
      distribution,
      velocity,
    ] = await Promise.all([
      getWeeklyStats(4),
      getAccuracyTrend(30),
      getCefrLevelProgress(),
      getCategoryPerformance(),
      getProgressDistribution(),
      getLearningVelocity(),
    ]);

    return {
      weeklyStats,
      accuracyTrend,
      cefrProgress,
      categoryPerformance,
      distribution,
      velocity,
    };
  } catch (error) {
    console.error('Error getting analytics snapshot:', error);
    return null;
  }
};

export default {
  getWeeklyStats,
  getDailyStats,
  getAccuracyTrend,
  getCefrLevelProgress,
  getCategoryPerformance,
  getReviewVsNewRatio,
  getProgressDistribution,
  getLearningVelocity,
  getAnalyticsSnapshot,
};
