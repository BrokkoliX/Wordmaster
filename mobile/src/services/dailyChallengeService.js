/**
 * Daily Challenge Service
 *
 * Generates a deterministic daily challenge based on user ID + date,
 * tracks progress, and manages challenge streaks.
 */

import db from './sqliteConnection';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { awardXp } from './xpService';

const CHALLENGE_TYPES = [
  {
    type: 'review_words',
    titleTemplate: 'Review {n} words',
    descTemplate: 'Complete a review session with at least {n} words',
    targets: [10, 15, 20, 30],
  },
  {
    type: 'learn_new',
    titleTemplate: 'Learn {n} new words',
    descTemplate: 'Encounter {n} words you haven\'t seen before',
    targets: [3, 5, 10],
  },
  {
    type: 'accuracy_target',
    titleTemplate: 'Achieve {n}% accuracy',
    descTemplate: 'Complete a session with at least {n}% accuracy',
    targets: [80, 85, 90],
  },
  {
    type: 'session_count',
    titleTemplate: 'Complete {n} sessions',
    descTemplate: 'Finish {n} practice sessions today',
    targets: [2, 3],
  },
];

/**
 * Simple deterministic hash from a string, returning a positive integer.
 */
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Generate a challenge for a given date. Uses a deterministic seed so
 * the same user sees the same challenge if the app restarts.
 */
export const generateChallenge = async (dateStr) => {
  try {
    const userId = (await AsyncStorage.getItem('wordmaster_user_id')) || 'guest';
    const seed = simpleHash(`${userId}_${dateStr}`);

    const typeIndex = seed % CHALLENGE_TYPES.length;
    const challengeDef = CHALLENGE_TYPES[typeIndex];
    const targetIndex = (seed >> 4) % challengeDef.targets.length;
    const target = challengeDef.targets[targetIndex];

    const title = challengeDef.titleTemplate.replace('{n}', target);
    const description = challengeDef.descTemplate.replace('{n}', target);

    const id = `challenge_${dateStr}`;

    await db.runAsync(
      `INSERT OR IGNORE INTO daily_challenges
       (id, date, challenge_type, title, description, target_value)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, dateStr, challengeDef.type, title, description, target]
    );

    const challenge = await db.getFirstAsync(
      'SELECT * FROM daily_challenges WHERE id = ?',
      [id]
    );

    return challenge;
  } catch (error) {
    console.error('Error generating challenge:', error);
    return null;
  }
};

/**
 * Get today's challenge, generating it if needed.
 */
export const getTodayChallenge = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];

    let challenge = await db.getFirstAsync(
      'SELECT * FROM daily_challenges WHERE date = ?',
      [today]
    );

    if (!challenge) {
      challenge = await generateChallenge(today);
    }

    return challenge;
  } catch (error) {
    console.error('Error getting today challenge:', error);
    return null;
  }
};

/**
 * Update challenge progress after a session completes.
 * Called from completeSession in database.js.
 *
 * @param {number} wordsReviewed - Words reviewed in the session
 * @param {number} correctAnswers - Correct answers in the session
 * @param {number} accuracy - Session accuracy percentage
 * @param {number} newWordsCount - New words encountered in the session
 */
export const updateChallengeProgress = async (wordsReviewed, correctAnswers, accuracy, newWordsCount = 0) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const challenge = await db.getFirstAsync(
      'SELECT * FROM daily_challenges WHERE date = ? AND is_completed = 0',
      [today]
    );

    if (!challenge) return null;

    let newValue = challenge.current_value;

    switch (challenge.challenge_type) {
      case 'review_words':
        newValue += wordsReviewed;
        break;
      case 'learn_new':
        newValue += newWordsCount;
        break;
      case 'accuracy_target':
        // Keep the highest accuracy achieved today
        newValue = Math.max(newValue, Math.round(accuracy));
        break;
      case 'session_count':
        newValue += 1;
        break;
    }

    const isCompleted = newValue >= challenge.target_value ? 1 : 0;

    await db.runAsync(
      `UPDATE daily_challenges SET
         current_value = ?,
         is_completed = ?,
         completed_at = CASE WHEN ? = 1 THEN datetime('now') ELSE completed_at END
       WHERE id = ?`,
      [newValue, isCompleted, isCompleted, challenge.id]
    );

    // Update challenge streak if completed
    if (isCompleted) {
      await updateChallengeStreak(today);
      await awardXp('daily_challenge_completed', challenge.id);
    }

    return {
      ...challenge,
      current_value: newValue,
      is_completed: isCompleted,
    };
  } catch (error) {
    console.error('Error updating challenge progress:', error);
    return null;
  }
};

/**
 * Update the challenge completion streak.
 */
const updateChallengeStreak = async (todayStr) => {
  try {
    const streakRow = await db.getFirstAsync(
      'SELECT * FROM challenge_streaks WHERE id = 1'
    );

    if (!streakRow) {
      await db.runAsync(
        'INSERT INTO challenge_streaks (id, current_streak, longest_streak, last_completed_date, total_completed) VALUES (1, 1, 1, ?, 1)',
        [todayStr]
      );
      return;
    }

    // Already completed today
    if (streakRow.last_completed_date === todayStr) return;

    let newStreak = 1;
    if (streakRow.last_completed_date) {
      const lastDate = new Date(streakRow.last_completed_date);
      const today = new Date(todayStr);
      const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        newStreak = streakRow.current_streak + 1;
      }
      // diffDays > 1 means streak broken, reset to 1
    }

    const newLongest = Math.max(newStreak, streakRow.longest_streak);
    const newTotal = streakRow.total_completed + 1;

    await db.runAsync(
      `UPDATE challenge_streaks SET
         current_streak = ?, longest_streak = ?,
         last_completed_date = ?, total_completed = ?
       WHERE id = 1`,
      [newStreak, newLongest, todayStr, newTotal]
    );
  } catch (error) {
    console.error('Error updating challenge streak:', error);
  }
};

/**
 * Get challenge streak data.
 */
export const getChallengeStreak = async () => {
  try {
    const row = await db.getFirstAsync('SELECT * FROM challenge_streaks WHERE id = 1');
    if (!row) {
      return { currentStreak: 0, longestStreak: 0, totalCompleted: 0 };
    }

    // Check if streak is still active (last completed must be today or yesterday)
    let currentStreak = row.current_streak;
    if (row.last_completed_date) {
      const lastDate = new Date(row.last_completed_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      lastDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
      if (diffDays > 1) {
        currentStreak = 0;
      }
    }

    return {
      currentStreak,
      longestStreak: row.longest_streak,
      totalCompleted: row.total_completed,
    };
  } catch (error) {
    console.error('Error getting challenge streak:', error);
    return { currentStreak: 0, longestStreak: 0, totalCompleted: 0 };
  }
};

/**
 * Get challenge history for the last N days.
 */
export const getChallengeHistory = async (limit = 30) => {
  try {
    const rows = await db.getAllAsync(
      'SELECT * FROM daily_challenges ORDER BY date DESC LIMIT ?',
      [limit]
    );
    return rows;
  } catch (error) {
    console.error('Error getting challenge history:', error);
    return [];
  }
};

export default {
  getTodayChallenge,
  generateChallenge,
  updateChallengeProgress,
  getChallengeStreak,
  getChallengeHistory,
};
