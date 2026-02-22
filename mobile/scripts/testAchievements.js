/**
 * Achievement System Testing Script
 * 
 * This script helps test achievement unlocks by simulating various conditions.
 * Run this in the Expo app using React Native Debugger or Chrome DevTools.
 * 
 * Usage:
 * 1. Import this in your test screen
 * 2. Call test functions to simulate achievement unlocks
 * 3. Verify achievements appear correctly
 */

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'wordmaster.db';
const db = SQLite.openDatabaseSync(DB_NAME);

/**
 * Reset all achievements (for clean testing)
 */
export const resetAllAchievements = async () => {
  try {
    console.log('🧹 Resetting all achievements...');
    await db.runAsync('DELETE FROM user_achievements');
    console.log('✅ All achievements reset');
    return true;
  } catch (error) {
    console.error('❌ Error resetting achievements:', error);
    return false;
  }
};

/**
 * View all user achievements
 */
export const viewAllAchievements = async () => {
  try {
    const achievements = await db.getAllAsync(`
      SELECT a.id, a.title, a.points, a.rarity,
             ua.is_completed, ua.progress_value, ua.progress_max
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id
      ORDER BY a.category, a.order_index
    `);
    
    console.log('📊 Achievement Status:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    let unlockedCount = 0;
    achievements.forEach(ach => {
      const status = ach.is_completed === 1 ? '✅' : '🔒';
      const progress = ach.progress_value && ach.progress_max 
        ? ` (${Math.round((ach.progress_value / ach.progress_max) * 100)}%)`
        : '';
      
      console.log(`${status} ${ach.title} - ${ach.points} pts - ${ach.rarity}${progress}`);
      
      if (ach.is_completed === 1) unlockedCount++;
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total: ${unlockedCount}/${achievements.length} unlocked`);
    
    return achievements;
  } catch (error) {
    console.error('❌ Error viewing achievements:', error);
    return [];
  }
};

/**
 * Manually unlock an achievement (for testing)
 */
export const unlockTestAchievement = async (achievementId) => {
  try {
    console.log(`🔓 Unlocking ${achievementId}...`);
    
    // Check if already unlocked
    const existing = await db.getFirstAsync(
      'SELECT * FROM user_achievements WHERE achievement_id = ?',
      [achievementId]
    );
    
    if (existing && existing.is_completed === 1) {
      console.log('⚠️  Achievement already unlocked');
      return false;
    }
    
    if (existing) {
      await db.runAsync(
        `UPDATE user_achievements 
         SET is_completed = 1, unlocked_at = datetime('now'), 
             progress_value = progress_max, notification_shown = 0
         WHERE achievement_id = ?`,
        [achievementId]
      );
    } else {
      const id = `test_${achievementId}_${Date.now()}`;
      await db.runAsync(
        `INSERT INTO user_achievements 
         (id, achievement_id, is_completed, progress_value, progress_max, notification_shown)
         VALUES (?, ?, 1, 100, 100, 0)`,
        [id, achievementId]
      );
    }
    
    console.log(`✅ ${achievementId} unlocked!`);
    return true;
  } catch (error) {
    console.error('❌ Error unlocking achievement:', error);
    return false;
  }
};

/**
 * Set streak to specific number (for streak testing)
 */
export const setStreak = async (days) => {
  try {
    console.log(`🔥 Setting streak to ${days} days...`);
    
    await db.runAsync(`
      UPDATE user_statistics 
      SET current_streak_days = ?,
          last_activity_date = date('now')
      WHERE id = 1
    `, [days]);
    
    console.log(`✅ Streak set to ${days} days`);
    return true;
  } catch (error) {
    console.error('❌ Error setting streak:', error);
    return false;
  }
};

/**
 * Set mastered words count (for mastery testing)
 */
export const setMasteredWords = async (count) => {
  try {
    console.log(`📚 Setting ${count} words as mastered...`);
    
    // Get words
    const words = await db.getAllAsync(
      'SELECT id FROM words LIMIT ?',
      [count]
    );
    
    // Mark them as mastered
    for (const word of words) {
      const existing = await db.getFirstAsync(
        'SELECT * FROM user_word_progress WHERE word_id = ?',
        [word.id]
      );
      
      if (existing) {
        await db.runAsync(
          `UPDATE user_word_progress 
           SET status = 'mastered', confidence_level = 75
           WHERE word_id = ?`,
          [word.id]
        );
      } else {
        const id = `test_prog_${word.id}_${Date.now()}`;
        await db.runAsync(
          `INSERT INTO user_word_progress 
           (id, word_id, status, confidence_level, times_shown, times_correct)
           VALUES (?, ?, 'mastered', 75, 10, 9)`,
          [id, word.id]
        );
      }
    }
    
    console.log(`✅ ${count} words marked as mastered`);
    return true;
  } catch (error) {
    console.error('❌ Error setting mastered words:', error);
    return false;
  }
};

/**
 * Get achievement statistics
 */
export const getAchievementStats = async () => {
  try {
    const stats = await db.getFirstAsync(`
      SELECT 
        COUNT(a.id) as total,
        COUNT(CASE WHEN ua.is_completed = 1 THEN 1 END) as unlocked,
        COALESCE(SUM(CASE WHEN ua.is_completed = 1 THEN a.points ELSE 0 END), 0) as points
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id
    `);
    
    console.log('📊 Achievement Statistics:');
    console.log(`   Total Achievements: ${stats.total}`);
    console.log(`   Unlocked: ${stats.unlocked}`);
    console.log(`   Total Points: ${stats.points}`);
    console.log(`   Completion: ${Math.round((stats.unlocked / stats.total) * 100)}%`);
    
    return stats;
  } catch (error) {
    console.error('❌ Error getting stats:', error);
    return null;
  }
};

/**
 * Test all First Steps achievements
 */
export const testFirstSteps = async () => {
  console.log('\n🌱 Testing First Steps Achievements...\n');
  
  await unlockTestAchievement('first_word');
  await unlockTestAchievement('first_session');
  await unlockTestAchievement('first_day');
  await unlockTestAchievement('first_level_up');
  await unlockTestAchievement('settings_visited');
  
  console.log('\n✅ First Steps tests complete!\n');
};

/**
 * Test all Streak achievements
 */
export const testStreakAchievements = async () => {
  console.log('\n🔥 Testing Streak Achievements...\n');
  
  console.log('Testing 3-day streak...');
  await setStreak(3);
  await unlockTestAchievement('streak_3');
  
  console.log('Testing 7-day streak...');
  await setStreak(7);
  await unlockTestAchievement('streak_7');
  
  console.log('Testing 14-day streak...');
  await setStreak(14);
  await unlockTestAchievement('streak_14');
  
  console.log('Testing 30-day streak...');
  await setStreak(30);
  await unlockTestAchievement('streak_30');
  
  console.log('\n✅ Streak tests complete!\n');
};

/**
 * Test all Mastery achievements
 */
export const testMasteryAchievements = async () => {
  console.log('\n📚 Testing Mastery Achievements...\n');
  
  console.log('Testing 10 words mastered...');
  await setMasteredWords(10);
  await unlockTestAchievement('words_10');
  
  console.log('Testing 50 words mastered...');
  await setMasteredWords(50);
  await unlockTestAchievement('words_50');
  
  console.log('Testing 100 words mastered...');
  await setMasteredWords(100);
  await unlockTestAchievement('words_100');
  
  console.log('\n✅ Mastery tests complete!\n');
};

/**
 * Run all tests
 */
export const runAllTests = async () => {
  console.log('\n🧪 Starting Achievement System Tests...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Reset first
  await resetAllAchievements();
  
  // Run tests
  await testFirstSteps();
  await testStreakAchievements();
  await testMasteryAchievements();
  
  // Show results
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  await getAchievementStats();
  await viewAllAchievements();
  
  console.log('\n🎉 All tests complete!\n');
};

/**
 * Quick test - unlock a few achievements to verify system works
 */
export const quickTest = async () => {
  console.log('\n⚡ Quick Achievement Test\n');
  
  await resetAllAchievements();
  await unlockTestAchievement('first_word');
  await unlockTestAchievement('first_session');
  await setStreak(7);
  await unlockTestAchievement('streak_7');
  await setMasteredWords(10);
  await unlockTestAchievement('words_10');
  
  await getAchievementStats();
  
  console.log('\n✅ Quick test complete! Check the Achievements screen.\n');
};

export default {
  resetAllAchievements,
  viewAllAchievements,
  unlockTestAchievement,
  setStreak,
  setMasteredWords,
  getAchievementStats,
  testFirstSteps,
  testStreakAchievements,
  testMasteryAchievements,
  runAllTests,
  quickTest
};
