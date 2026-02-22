import db from './db';

/**
 * Initialize Achievement System Tables
 * Call this during app initialization, after main database setup
 */
export const initAchievementTables = async () => {
  try {
    console.log('📊 Initializing Achievement System tables...');
    
    await db.execAsync(`
      -- Master achievement definitions table
      CREATE TABLE IF NOT EXISTS achievements (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        rarity TEXT NOT NULL CHECK(rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
        points INTEGER NOT NULL DEFAULT 0,
        unlock_criteria TEXT NOT NULL,
        hidden INTEGER DEFAULT 0,
        order_index INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );
      
      -- User's unlocked achievements
      CREATE TABLE IF NOT EXISTS user_achievements (
        id TEXT PRIMARY KEY,
        achievement_id TEXT NOT NULL,
        unlocked_at TEXT DEFAULT (datetime('now')),
        progress_value REAL DEFAULT 0,
        progress_max REAL DEFAULT 100,
        is_completed INTEGER DEFAULT 0,
        notification_shown INTEGER DEFAULT 0,
        FOREIGN KEY (achievement_id) REFERENCES achievements(id)
      );
      
      -- Session metadata for speed/timing achievements
      CREATE TABLE IF NOT EXISTS session_metadata (
        session_id TEXT PRIMARY KEY,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        duration_seconds INTEGER,
        words_count INTEGER DEFAULT 0,
        correct_count INTEGER DEFAULT 0,
        hour_of_day INTEGER,
        FOREIGN KEY (session_id) REFERENCES sessions(id)
      );
      
      -- Category practice tracking (for explorer achievements)
      CREATE TABLE IF NOT EXISTS category_practice_log (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        word_id TEXT NOT NULL,
        practiced_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (category_id) REFERENCES categories(id),
        FOREIGN KEY (word_id) REFERENCES words(id)
      );
      
      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_user_achievements_completed 
      ON user_achievements(is_completed);
      
      CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement 
      ON user_achievements(achievement_id);
      
      CREATE INDEX IF NOT EXISTS idx_session_metadata_completed 
      ON session_metadata(completed_at);
      
      CREATE INDEX IF NOT EXISTS idx_category_practice_category 
      ON category_practice_log(category_id);
    `);
    
    console.log('✅ Achievement tables initialized');
    
    // Seed achievement definitions
    const achievementCount = await db.getFirstAsync(
      'SELECT COUNT(*) as count FROM achievements'
    );
    
    if (achievementCount.count === 0) {
      console.log('📥 Seeding achievement definitions...');
      await seedAchievements();
      console.log('✅ Achievement definitions loaded');
    } else {
      console.log(`✅ ${achievementCount.count} achievements already defined`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error initializing achievement tables:', error);
    throw error;
  }
};

/**
 * Seed all achievement definitions
 */
const seedAchievements = async () => {
  const achievements = [
    // Category 1: First Steps (Onboarding)
    {
      id: 'first_word',
      category: 'first_steps',
      title: 'First Word',
      description: 'Learn your first word',
      icon: '🌱',
      rarity: 'common',
      points: 10,
      unlock_criteria: JSON.stringify({ type: 'words_practiced', value: 1 }),
      order_index: 1
    },
    {
      id: 'first_session',
      category: 'first_steps',
      title: 'Getting Started',
      description: 'Complete your first learning session',
      icon: '🎯',
      rarity: 'common',
      points: 20,
      unlock_criteria: JSON.stringify({ type: 'sessions_completed', value: 1 }),
      order_index: 2
    },
    {
      id: 'first_day',
      category: 'first_steps',
      title: 'Day One Complete',
      description: 'Finish your first day of learning',
      icon: '✅',
      rarity: 'common',
      points: 30,
      unlock_criteria: JSON.stringify({ type: 'days_practiced', value: 1 }),
      order_index: 3
    },
    {
      id: 'first_level_up',
      category: 'first_steps',
      title: 'Rising Star',
      description: 'Advance to a new CEFR level',
      icon: '⭐',
      rarity: 'uncommon',
      points: 50,
      unlock_criteria: JSON.stringify({ type: 'level_advanced', value: 1 }),
      order_index: 4
    },
    {
      id: 'settings_visited',
      category: 'first_steps',
      title: 'Customizer',
      description: 'Personalize your learning experience',
      icon: '⚙️',
      rarity: 'common',
      points: 10,
      unlock_criteria: JSON.stringify({ type: 'settings_changed', value: 1 }),
      order_index: 5
    },
    
    // Category 2: Streak Warriors (Consistency)
    {
      id: 'streak_3',
      category: 'streaks',
      title: 'Streak Starter',
      description: 'Learn for 3 days in a row',
      icon: '🔥',
      rarity: 'common',
      points: 30,
      unlock_criteria: JSON.stringify({ type: 'streak_days', value: 3 }),
      order_index: 10
    },
    {
      id: 'streak_7',
      category: 'streaks',
      title: 'Week Warrior',
      description: 'Maintain a 7-day learning streak',
      icon: '🔥',
      rarity: 'uncommon',
      points: 100,
      unlock_criteria: JSON.stringify({ type: 'streak_days', value: 7 }),
      order_index: 11
    },
    {
      id: 'streak_14',
      category: 'streaks',
      title: 'Dedicated Learner',
      description: 'Two weeks of consistent practice',
      icon: '🔥',
      rarity: 'uncommon',
      points: 200,
      unlock_criteria: JSON.stringify({ type: 'streak_days', value: 14 }),
      order_index: 12
    },
    {
      id: 'streak_30',
      category: 'streaks',
      title: 'Month Master',
      description: '30 days of unstoppable learning',
      icon: '🔥',
      rarity: 'rare',
      points: 500,
      unlock_criteria: JSON.stringify({ type: 'streak_days', value: 30 }),
      order_index: 13
    },
    {
      id: 'streak_100',
      category: 'streaks',
      title: 'Centurion',
      description: '100 days of dedication - truly impressive!',
      icon: '💯',
      rarity: 'epic',
      points: 2000,
      unlock_criteria: JSON.stringify({ type: 'streak_days', value: 100 }),
      order_index: 14
    },
    {
      id: 'streak_365',
      category: 'streaks',
      title: 'Legendary Streak',
      description: "One full year of daily learning - you're a legend!",
      icon: '👑',
      rarity: 'legendary',
      points: 10000,
      unlock_criteria: JSON.stringify({ type: 'streak_days', value: 365 }),
      order_index: 15
    },
    
    // Category 3: Word Mastery (Volume)
    {
      id: 'words_10',
      category: 'mastery',
      title: 'Vocabulary Builder',
      description: 'Master 10 words',
      icon: '📚',
      rarity: 'common',
      points: 20,
      unlock_criteria: JSON.stringify({ type: 'words_mastered', value: 10 }),
      order_index: 20
    },
    {
      id: 'words_50',
      category: 'mastery',
      title: 'Word Collector',
      description: 'Master 50 words',
      icon: '📚',
      rarity: 'uncommon',
      points: 100,
      unlock_criteria: JSON.stringify({ type: 'words_mastered', value: 50 }),
      order_index: 21
    },
    {
      id: 'words_100',
      category: 'mastery',
      title: 'Hundred Club',
      description: 'Master 100 words',
      icon: '💯',
      rarity: 'uncommon',
      points: 200,
      unlock_criteria: JSON.stringify({ type: 'words_mastered', value: 100 }),
      order_index: 22
    },
    {
      id: 'words_250',
      category: 'mastery',
      title: 'Word Enthusiast',
      description: 'Master 250 words',
      icon: '📖',
      rarity: 'rare',
      points: 500,
      unlock_criteria: JSON.stringify({ type: 'words_mastered', value: 250 }),
      order_index: 23
    },
    {
      id: 'words_500',
      category: 'mastery',
      title: 'Vocabulary Master',
      description: 'Master 500 words - conversational fluency!',
      icon: '🎓',
      rarity: 'rare',
      points: 1000,
      unlock_criteria: JSON.stringify({ type: 'words_mastered', value: 500 }),
      order_index: 24
    },
    {
      id: 'words_1000',
      category: 'mastery',
      title: 'Word Wizard',
      description: "Master 1000 words - you're unstoppable!",
      icon: '🧙‍♂️',
      rarity: 'epic',
      points: 2500,
      unlock_criteria: JSON.stringify({ type: 'words_mastered', value: 1000 }),
      order_index: 25
    },
    {
      id: 'words_5000',
      category: 'mastery',
      title: 'Polyglot Legend',
      description: 'Master 5000 words - near-native proficiency!',
      icon: '🌟',
      rarity: 'legendary',
      points: 10000,
      unlock_criteria: JSON.stringify({ type: 'words_mastered', value: 5000 }),
      order_index: 26
    },
    
    // Category 4: Speed Learning (Efficiency)
    {
      id: 'speed_20_in_10min',
      category: 'speed',
      title: 'Quick Learner',
      description: 'Complete 20 words in under 10 minutes',
      icon: '⚡',
      rarity: 'uncommon',
      points: 50,
      unlock_criteria: JSON.stringify({ type: 'session_speed', words: 20, max_seconds: 600 }),
      order_index: 30
    },
    {
      id: 'speed_50_in_session',
      category: 'speed',
      title: 'Speed Demon',
      description: 'Learn 50 words in a single session',
      icon: '🚀',
      rarity: 'rare',
      points: 150,
      unlock_criteria: JSON.stringify({ type: 'session_words', value: 50 }),
      order_index: 31
    },
    {
      id: 'speed_100_in_session',
      category: 'speed',
      title: 'Marathon Runner',
      description: 'Incredible! 100 words in one session',
      icon: '🏃',
      rarity: 'epic',
      points: 500,
      unlock_criteria: JSON.stringify({ type: 'session_words', value: 100 }),
      order_index: 32
    },
    {
      id: 'morning_learner',
      category: 'speed',
      title: 'Early Bird',
      description: 'Complete a session before 8 AM',
      icon: '🌅',
      rarity: 'uncommon',
      points: 30,
      unlock_criteria: JSON.stringify({ type: 'session_hour', max_hour: 8 }),
      order_index: 33
    },
    
    // Category 5: Perfect Performance (Accuracy)
    {
      id: 'perfect_10',
      category: 'accuracy',
      title: 'Perfect Start',
      description: 'Get 10 words correct in a row',
      icon: '✨',
      rarity: 'uncommon',
      points: 50,
      unlock_criteria: JSON.stringify({ type: 'consecutive_correct', value: 10 }),
      order_index: 40
    },
    {
      id: 'perfect_20',
      category: 'accuracy',
      title: 'Flawless',
      description: 'Get 20 words correct in a row',
      icon: '💎',
      rarity: 'rare',
      points: 150,
      unlock_criteria: JSON.stringify({ type: 'consecutive_correct', value: 20 }),
      order_index: 41
    },
    {
      id: 'session_100_percent',
      category: 'accuracy',
      title: 'Perfectionist',
      description: 'Complete a session with 100% accuracy',
      icon: '🎯',
      rarity: 'rare',
      points: 200,
      unlock_criteria: JSON.stringify({ type: 'session_accuracy', value: 100, min_words: 20 }),
      order_index: 42
    },
    {
      id: 'avg_accuracy_90',
      category: 'accuracy',
      title: 'Accuracy Expert',
      description: 'Maintain 90%+ accuracy over 100 words',
      icon: '🏅',
      rarity: 'epic',
      points: 500,
      unlock_criteria: JSON.stringify({ type: 'overall_accuracy', value: 90, min_words: 100 }),
      order_index: 43
    },
    
    // Category 6: Language Explorer (Diversity)
    {
      id: 'languages_2',
      category: 'explorer',
      title: 'Polyglot Apprentice',
      description: 'Start learning a second language',
      icon: '🌍',
      rarity: 'uncommon',
      points: 100,
      unlock_criteria: JSON.stringify({ type: 'languages_count', value: 2 }),
      order_index: 50
    },
    {
      id: 'languages_3',
      category: 'explorer',
      title: 'Multilingual',
      description: 'Learn 3 different languages',
      icon: '🌎',
      rarity: 'rare',
      points: 300,
      unlock_criteria: JSON.stringify({ type: 'languages_count', value: 3 }),
      order_index: 51
    },
    {
      id: 'languages_5',
      category: 'explorer',
      title: 'Language Master',
      description: 'Learn 5 different languages!',
      icon: '🌏',
      rarity: 'epic',
      points: 1000,
      unlock_criteria: JSON.stringify({ type: 'languages_count', value: 5 }),
      order_index: 52
    },
    
    // Category 7: Special/Hidden (Easter Eggs)
    {
      id: 'night_owl',
      category: 'special',
      title: 'Night Owl',
      description: 'Learn after midnight - dedication!',
      icon: '🦉',
      rarity: 'uncommon',
      points: 30,
      unlock_criteria: JSON.stringify({ type: 'session_hour', min_hour: 0, max_hour: 5 }),
      hidden: 1,
      order_index: 60
    },
    {
      id: 'comeback_kid',
      category: 'special',
      title: 'Comeback Kid',
      description: 'Resume learning after 30+ days away',
      icon: '🎉',
      rarity: 'uncommon',
      points: 50,
      unlock_criteria: JSON.stringify({ type: 'days_inactive', value: 30 }),
      hidden: 1,
      order_index: 61
    },
    {
      id: 'categories_10',
      category: 'special',
      title: 'Category Explorer',
      description: 'Practice words from 10 different categories',
      icon: '🗂️',
      rarity: 'rare',
      points: 150,
      unlock_criteria: JSON.stringify({ type: 'categories_count', value: 10 }),
      order_index: 62
    }
  ];
  
  try {
    for (const achievement of achievements) {
      await db.runAsync(
        `INSERT INTO achievements 
         (id, category, title, description, icon, rarity, points, unlock_criteria, hidden, order_index)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          achievement.id,
          achievement.category,
          achievement.title,
          achievement.description,
          achievement.icon,
          achievement.rarity,
          achievement.points,
          achievement.unlock_criteria,
          achievement.hidden || 0,
          achievement.order_index
        ]
      );
    }
    
    console.log(`✅ Seeded ${achievements.length} achievement definitions`);
  } catch (error) {
    console.error('❌ Error seeding achievements:', error);
    throw error;
  }
};

/**
 * Get all achievement definitions
 */
export const getAllAchievements = async () => {
  try {
    const achievements = await db.getAllAsync(
      'SELECT * FROM achievements ORDER BY category, order_index'
    );
    
    // Parse unlock_criteria JSON
    return achievements.map(ach => ({
      ...ach,
      unlock_criteria: JSON.parse(ach.unlock_criteria),
      hidden: ach.hidden === 1
    }));
  } catch (error) {
    console.error('Error getting achievements:', error);
    throw error;
  }
};

/**
 * Get user's achievements with unlock status
 */
export const getUserAchievements = async () => {
  try {
    const achievements = await db.getAllAsync(`
      SELECT 
        a.*,
        ua.id as user_achievement_id,
        ua.unlocked_at,
        ua.progress_value,
        ua.progress_max,
        ua.is_completed,
        ua.notification_shown
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id
      ORDER BY a.category, a.order_index
    `);
    
    // Parse and format
    return achievements.map(ach => ({
      ...ach,
      unlock_criteria: JSON.parse(ach.unlock_criteria),
      hidden: ach.hidden === 1,
      unlocked: ach.is_completed === 1,
      progress: ach.progress_value || 0,
      progressMax: ach.progress_max || 100
    }));
  } catch (error) {
    console.error('Error getting user achievements:', error);
    throw error;
  }
};

/**
 * Update achievement progress
 */
export const updateAchievementProgress = async (achievementId, progressValue, progressMax = 100) => {
  try {
    // Check if user achievement record exists
    const existing = await db.getFirstAsync(
      'SELECT * FROM user_achievements WHERE achievement_id = ?',
      [achievementId]
    );
    
    if (existing) {
      // Update existing
      await db.runAsync(
        `UPDATE user_achievements 
         SET progress_value = ?, progress_max = ?, is_completed = ?
         WHERE achievement_id = ?`,
        [progressValue, progressMax, progressValue >= progressMax ? 1 : 0, achievementId]
      );
    } else {
      // Create new
      const id = `user_ach_${achievementId}_${Date.now()}`;
      await db.runAsync(
        `INSERT INTO user_achievements 
         (id, achievement_id, progress_value, progress_max, is_completed)
         VALUES (?, ?, ?, ?, ?)`,
        [id, achievementId, progressValue, progressMax, progressValue >= progressMax ? 1 : 0]
      );
    }
    
    // Return if unlocked
    return progressValue >= progressMax;
  } catch (error) {
    console.error('Error updating achievement progress:', error);
    throw error;
  }
};

/**
 * Mark achievement as unlocked
 */
export const unlockAchievement = async (achievementId) => {
  try {
    const existing = await db.getFirstAsync(
      'SELECT * FROM user_achievements WHERE achievement_id = ?',
      [achievementId]
    );
    
    if (existing && existing.is_completed === 1) {
      // Already unlocked
      return false;
    }
    
    if (existing) {
      // Update to completed
      await db.runAsync(
        `UPDATE user_achievements 
         SET is_completed = 1, unlocked_at = datetime('now'), 
             progress_value = progress_max, notification_shown = 0
         WHERE achievement_id = ?`,
        [achievementId]
      );
    } else {
      // Create as completed
      const id = `user_ach_${achievementId}_${Date.now()}`;
      await db.runAsync(
        `INSERT INTO user_achievements 
         (id, achievement_id, is_completed, progress_value, progress_max, notification_shown)
         VALUES (?, ?, 1, 100, 100, 0)`,
        [id, achievementId]
      );
    }
    
    return true; // Newly unlocked
  } catch (error) {
    console.error('Error unlocking achievement:', error);
    throw error;
  }
};

/**
 * Get pending achievement notifications (not yet shown)
 */
export const getPendingAchievements = async () => {
  try {
    const achievements = await db.getAllAsync(`
      SELECT a.*, ua.unlocked_at
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.is_completed = 1 AND ua.notification_shown = 0
      ORDER BY ua.unlocked_at ASC
    `);
    
    return achievements.map(ach => ({
      ...ach,
      unlock_criteria: JSON.parse(ach.unlock_criteria)
    }));
  } catch (error) {
    console.error('Error getting pending achievements:', error);
    throw error;
  }
};

/**
 * Mark achievement notification as shown
 */
export const markAchievementNotificationShown = async (achievementId) => {
  try {
    await db.runAsync(
      'UPDATE user_achievements SET notification_shown = 1 WHERE achievement_id = ?',
      [achievementId]
    );
  } catch (error) {
    console.error('Error marking notification shown:', error);
    throw error;
  }
};

/**
 * Get total achievement points earned
 */
export const getTotalAchievementPoints = async () => {
  try {
    const result = await db.getFirstAsync(`
      SELECT COALESCE(SUM(a.points), 0) as total_points
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.is_completed = 1
    `);
    
    return result?.total_points || 0;
  } catch (error) {
    console.error('Error getting total points:', error);
    return 0;
  }
};

/**
 * Get achievement statistics
 */
export const getAchievementStats = async () => {
  try {
    const stats = await db.getFirstAsync(`
      SELECT 
        COUNT(a.id) as total_achievements,
        COUNT(CASE WHEN ua.is_completed = 1 THEN 1 END) as unlocked_count,
        COALESCE(SUM(CASE WHEN ua.is_completed = 1 THEN a.points ELSE 0 END), 0) as total_points
      FROM achievements a
      LEFT JOIN user_achievements ua ON a.id = ua.achievement_id
    `);
    
    return {
      total: stats?.total_achievements || 0,
      unlocked: stats?.unlocked_count || 0,
      totalPoints: stats?.total_points || 0,
      percentComplete: stats?.total_achievements > 0 
        ? Math.round((stats.unlocked_count / stats.total_achievements) * 100) 
        : 0
    };
  } catch (error) {
    console.error('Error getting achievement stats:', error);
    return {
      total: 0,
      unlocked: 0,
      totalPoints: 0,
      percentComplete: 0
    };
  }
};

/**
 * Log category practice (for category explorer achievement)
 */
export const logCategoryPractice = async (categoryId, wordId) => {
  try {
    const id = `cat_log_${categoryId}_${wordId}_${Date.now()}`;
    await db.runAsync(
      'INSERT INTO category_practice_log (id, category_id, word_id) VALUES (?, ?, ?)',
      [id, categoryId, wordId]
    );
  } catch (error) {
    console.error('Error logging category practice:', error);
  }
};

/**
 * Get count of unique categories practiced
 */
export const getUniqueCategoriesPracticed = async () => {
  try {
    const result = await db.getFirstAsync(
      'SELECT COUNT(DISTINCT category_id) as count FROM category_practice_log'
    );
    return result?.count || 0;
  } catch (error) {
    console.error('Error getting unique categories:', error);
    return 0;
  }
};

/**
 * Log session metadata (for speed/timing achievements)
 */
export const logSessionMetadata = async (sessionId, metadata) => {
  try {
    const hourOfDay = new Date().getHours();
    
    await db.runAsync(
      `INSERT INTO session_metadata 
       (session_id, started_at, completed_at, duration_seconds, words_count, correct_count, hour_of_day)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        sessionId,
        metadata.startedAt,
        metadata.completedAt || null,
        metadata.durationSeconds || null,
        metadata.wordsCount || 0,
        metadata.correctCount || 0,
        hourOfDay
      ]
    );
  } catch (error) {
    console.error('Error logging session metadata:', error);
  }
};

/**
 * Update session metadata when session completes
 */
export const updateSessionMetadata = async (sessionId, completedAt, durationSeconds, wordsCount, correctCount) => {
  try {
    await db.runAsync(
      `UPDATE session_metadata 
       SET completed_at = ?, duration_seconds = ?, words_count = ?, correct_count = ?
       WHERE session_id = ?`,
      [completedAt, durationSeconds, wordsCount, correctCount, sessionId]
    );
  } catch (error) {
    console.error('Error updating session metadata:', error);
  }
};

export default {
  initAchievementTables,
  getAllAchievements,
  getUserAchievements,
  updateAchievementProgress,
  unlockAchievement,
  getPendingAchievements,
  markAchievementNotificationShown,
  getTotalAchievementPoints,
  getAchievementStats,
  logCategoryPractice,
  getUniqueCategoriesPracticed,
  logSessionMetadata,
  updateSessionMetadata
};
