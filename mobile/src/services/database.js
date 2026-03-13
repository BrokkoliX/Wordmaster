import categoriesData from '../data/categories.json';
import { calculateStreak, checkMilestoneReached } from './streakService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncWordsFromApi, isSyncNeeded } from './wordApiService';
import { syncSentencesFromApi, isSentenceSyncNeeded, initSentenceTable } from './sentenceApiService';
import { initAchievementTables } from './achievementDatabase';
import { syncProgressToServer } from './progressSyncService';
import { updateChallengeProgress } from './dailyChallengeService';
import { initXpTable, awardXp } from './xpService';
import { GRAMMATICAL_FILTER_W } from '../constants/sqlFilters';
import { getLevelsUpTo } from '../constants/cefrLevels';
import db from './sqliteConnection';

// Initialize database with schema
export const initDatabase = async () => {
  try {
    console.log('Initializing database...');
    
    // Create tables
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      
      CREATE TABLE IF NOT EXISTS words (
        id TEXT PRIMARY KEY,
        word TEXT NOT NULL,
        translation TEXT NOT NULL,
        difficulty INTEGER DEFAULT 1,
        category TEXT,
        frequency_rank INTEGER,
        cefr_level TEXT,
        source_lang TEXT DEFAULT 'en',
        target_lang TEXT DEFAULT 'es'
      );
      
      CREATE TABLE IF NOT EXISTS user_word_progress (
        id TEXT PRIMARY KEY,
        word_id TEXT NOT NULL,
        status TEXT DEFAULT 'new',
        confidence_level INTEGER DEFAULT 0,
        times_shown INTEGER DEFAULT 0,
        times_correct INTEGER DEFAULT 0,
        times_incorrect INTEGER DEFAULT 0,
        consecutive_correct INTEGER DEFAULT 0,
        ease_factor REAL DEFAULT 2.5,
        interval_days INTEGER DEFAULT 0,
        next_review_date TEXT DEFAULT (date('now')),
        last_reviewed_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (word_id) REFERENCES words(id)
      );
      
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        started_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT,
        words_reviewed INTEGER DEFAULT 0,
        correct_answers INTEGER DEFAULT 0,
        accuracy REAL,
        new_words_introduced INTEGER DEFAULT 0
      );
      
      CREATE TABLE IF NOT EXISTS user_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
      
      CREATE TABLE IF NOT EXISTS user_statistics (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        current_streak_days INTEGER DEFAULT 0,
        longest_streak_days INTEGER DEFAULT 0,
        last_activity_date TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        description TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_progress_next_review 
      ON user_word_progress(next_review_date);
      
      CREATE INDEX IF NOT EXISTS idx_progress_status 
      ON user_word_progress(status);
      
      CREATE INDEX IF NOT EXISTS idx_words_category 
      ON words(category);
      
      CREATE INDEX IF NOT EXISTS idx_words_difficulty 
      ON words(difficulty);

      CREATE TABLE IF NOT EXISTS word_lists (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        icon TEXT DEFAULT '📝',
        color TEXT DEFAULT '#3498DB',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS word_list_items (
        id TEXT PRIMARY KEY,
        list_id TEXT NOT NULL,
        word_id TEXT NOT NULL,
        added_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (list_id) REFERENCES word_lists(id) ON DELETE CASCADE,
        FOREIGN KEY (word_id) REFERENCES words(id),
        UNIQUE(list_id, word_id)
      );

      CREATE INDEX IF NOT EXISTS idx_word_list_items_list
      ON word_list_items(list_id);

      CREATE TABLE IF NOT EXISTS daily_challenges (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL UNIQUE,
        challenge_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        target_value INTEGER NOT NULL,
        current_value INTEGER DEFAULT 0,
        is_completed INTEGER DEFAULT 0,
        category_filter TEXT,
        cefr_filter TEXT,
        completed_at TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS challenge_streaks (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_completed_date TEXT,
        total_completed INTEGER DEFAULT 0
      );
    `);
    
    // Sync words from backend API (only the user's language pair + level)
    const wordCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM words');
    const syncNeeded = await isSyncNeeded();
    
    if (wordCount.count === 0 || syncNeeded) {
      console.log('📡 Syncing words from backend API...');
      try {
        await syncWordsFromApi();
      } catch (error) {
        console.error('⚠️  API sync failed (will use cached words if available):', error.message);
      }
    } else {
      console.log(`✅ Local word cache: ${wordCount.count.toLocaleString()} words (up to date)`);
    }

    // Sync sentence templates for fill-in-the-blank exercises
    await initSentenceTable();
    const sentenceSyncNeeded = await isSentenceSyncNeeded();
    if (sentenceSyncNeeded) {
      console.log('📡 Syncing sentence templates...');
      try {
        await syncSentencesFromApi();
      } catch (error) {
        console.error('⚠️  Sentence sync failed:', error.message);
      }
    }
    
    // Check if categories are already loaded
    const categoryCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM categories');
    
    if (categoryCount.count === 0) {
      console.log('Loading category data...');
      
      // Insert categories
      for (const category of categoriesData) {
        await db.runAsync(
          'INSERT INTO categories (id, name, icon, color, description) VALUES (?, ?, ?, ?, ?)',
          [category.id, category.name, category.icon, category.color, category.description]
        );
      }
      
      console.log(`Loaded ${categoriesData.length} categories into database`);
    }
    
    // Initialize Achievement System tables
    await initAchievementTables();

    // Initialize XP event queue table
    await initXpTable();

    // Auto-create built-in Favorites list
    const favExists = await db.getFirstAsync(
      "SELECT id FROM word_lists WHERE id = '__favorites__'"
    );
    if (!favExists) {
      await db.runAsync(
        "INSERT INTO word_lists (id, name, description, icon, color) VALUES ('__favorites__', 'Favorites', 'Your bookmarked words', '⭐', '#FFB84D')"
      );
    }

    // Initialize challenge streaks row
    await db.runAsync(
      'INSERT OR IGNORE INTO challenge_streaks (id, current_streak, longest_streak, total_completed) VALUES (1, 0, 0, 0)'
    );
    
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

// Wrapper for backward-compat: returns allowed CEFR levels up to the given one.
const getAllowedCefrLevels = (level) => getLevelsUpTo(level);

// Get words due for review
export const getWordsDueForReview = async (limit = 20, category = null) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get user's preferences
    const cefrLevel = await AsyncStorage.getItem('cefrLevel') || 'A1';
    const knownLanguage = await AsyncStorage.getItem('knownLanguage') || 'en';
    const learningLanguage = await AsyncStorage.getItem('learningLanguage') || 'es';
    
    const allowedLevels = getAllowedCefrLevels(cefrLevel);
    const levelPlaceholders = allowedLevels.map(() => '?').join(',');
    
    // Build optional category filter
    const useCategory = category && category !== 'all';
    const categoryClause = useCategory ? 'AND w.category = ?' : '';
    
    const params = [
      ...allowedLevels,
      knownLanguage,
      learningLanguage,
      ...(useCategory ? [category] : []),
      today,
      today,
      cefrLevel,
      limit,
    ];
    
    const words = await db.getAllAsync(`
      SELECT w.*, p.id as progress_id, p.status, p.confidence_level,
             p.consecutive_correct, p.ease_factor, p.interval_days,
             p.times_shown, p.times_correct, p.times_incorrect
      FROM words w
      LEFT JOIN user_word_progress p ON w.id = p.word_id
      WHERE w.cefr_level IN (${levelPlaceholders})
        AND w.source_lang = ?
        AND w.target_lang = ?
        ${categoryClause}
        ${GRAMMATICAL_FILTER_W}
        AND (p.next_review_date IS NULL OR p.next_review_date <= ?)
      ORDER BY 
        CASE 
          WHEN p.next_review_date IS NOT NULL AND p.next_review_date < ? THEN 0
          WHEN p.next_review_date IS NOT NULL THEN 1
          WHEN w.cefr_level = ? THEN 2
          ELSE 3
        END,
        p.next_review_date ASC,
        CASE w.cefr_level
          WHEN 'C2' THEN 6 WHEN 'C1' THEN 5 WHEN 'B2' THEN 4
          WHEN 'B1' THEN 3 WHEN 'A2' THEN 2 WHEN 'A1' THEN 1 ELSE 0
        END DESC,
        w.frequency_rank ASC
      LIMIT ?
    `, params);
    
    if (words.length === 0) {
      console.log(`⚠️  No words available for ${knownLanguage} → ${learningLanguage} at ${cefrLevel} level`);
      console.log(`   Try checking if words exist in database for this language pair`);
      // Debug: Check total words for this pair
      const totalWords = await db.getFirstAsync(
        'SELECT COUNT(*) as count FROM words WHERE source_lang = ? AND target_lang = ?',
        [knownLanguage, learningLanguage]
      );
      console.log(`   Total words in DB for ${knownLanguage}→${learningLanguage}: ${totalWords?.count || 0}`);
    }
    
    return words;
  } catch (error) {
    console.error('Error getting words due for review:', error);
    throw error;
  }
};

// Get random new words
export const getNewWords = async (limit = 5, category = null) => {
  try {
    // Get user's preferences
    const cefrLevel = await AsyncStorage.getItem('cefrLevel') || 'A1';
    const knownLanguage = await AsyncStorage.getItem('knownLanguage') || 'en';
    const learningLanguage = await AsyncStorage.getItem('learningLanguage') || 'es';
    
    const allowedLevels = getAllowedCefrLevels(cefrLevel);
    const levelPlaceholders = allowedLevels.map(() => '?').join(',');
    
    // Build optional category filter
    const useCategory = category && category !== 'all';
    const categoryClause = useCategory ? 'AND w.category = ?' : '';
    
    const params = [
      ...allowedLevels,
      knownLanguage,
      learningLanguage,
      ...(useCategory ? [category] : []),
      cefrLevel,
      limit,
    ];
    
    const words = await db.getAllAsync(`
      SELECT w.*
      FROM words w
      LEFT JOIN user_word_progress p ON w.id = p.word_id
      WHERE p.id IS NULL
        AND w.cefr_level IN (${levelPlaceholders})
        AND w.source_lang = ?
        AND w.target_lang = ?
        ${categoryClause}
        ${GRAMMATICAL_FILTER_W}
      ORDER BY
        CASE WHEN w.cefr_level = ? THEN 0 ELSE 1 END,
        CASE w.cefr_level
          WHEN 'C2' THEN 6 WHEN 'C1' THEN 5 WHEN 'B2' THEN 4
          WHEN 'B1' THEN 3 WHEN 'A2' THEN 2 WHEN 'A1' THEN 1 ELSE 0
        END DESC,
        w.frequency_rank ASC,
        RANDOM()
      LIMIT ?
    `, params);
    
    return words;
  } catch (error) {
    console.error('Error getting new words:', error);
    throw error;
  }
};

// Initialize progress for a word
export const initializeWordProgress = async (wordId) => {
  try {
    const progressId = `progress_${wordId}_${Date.now()}`;
    
    await db.runAsync(
      `INSERT INTO user_word_progress 
       (id, word_id, status, next_review_date) 
       VALUES (?, ?, 'new', date('now'))`,
      [progressId, wordId]
    );
    
    return progressId;
  } catch (error) {
    console.error('Error initializing word progress:', error);
    throw error;
  }
};

// Update word progress after review
export const updateWordProgress = async (wordId, isCorrect, responseTime) => {
  try {
    // Get current progress
    let progress = await db.getFirstAsync(
      'SELECT * FROM user_word_progress WHERE word_id = ?',
      [wordId]
    );
    
    // If no progress exists, initialize it
    if (!progress) {
      const progressId = await initializeWordProgress(wordId);
      progress = await db.getFirstAsync(
        'SELECT * FROM user_word_progress WHERE id = ?',
        [progressId]
      );
    }
    
    // Calculate new values using SM-2 algorithm
    const newTimesShown = progress.times_shown + 1;
    const newTimesCorrect = progress.times_correct + (isCorrect ? 1 : 0);
    const newTimesIncorrect = progress.times_incorrect + (isCorrect ? 0 : 1);
    const newConsecutiveCorrect = isCorrect ? progress.consecutive_correct + 1 : 0;
    
    let newInterval = progress.interval_days;
    let newEaseFactor = progress.ease_factor;
    
    if (isCorrect) {
      // SM-2 Algorithm
      if (newConsecutiveCorrect === 1) {
        newInterval = 1;
      } else if (newConsecutiveCorrect === 2) {
        newInterval = 6;
      } else {
        newInterval = Math.round(progress.interval_days * newEaseFactor);
      }
      
      // Adjust ease factor based on response time (if provided)
      if (responseTime) {
        if (responseTime < 2000) {
          newEaseFactor = Math.min(3.0, newEaseFactor + 0.1);
        } else if (responseTime > 5000) {
          newEaseFactor = Math.max(1.3, newEaseFactor - 0.05);
        }
      }
    } else {
      // Reset on incorrect
      newInterval = 1;
      newEaseFactor = Math.max(1.3, newEaseFactor - 0.2);
    }
    
    // Calculate confidence level
    const cappedConsecutive = Math.min(newConsecutiveCorrect, 5);
    const accuracyRatio = newTimesShown > 0 ? newTimesCorrect / newTimesShown : 0;
    const easePoints = ((newEaseFactor - 1.3) / 1.7) * 10;
    const intervalBonus = newInterval > 30 ? 10 : 0;
    
    const newConfidenceLevel = Math.round(
      (cappedConsecutive * 10) +
      (accuracyRatio * 30) +
      easePoints +
      intervalBonus
    );
    
    // Determine status
    let newStatus = 'new';
    if (newConfidenceLevel >= 91) newStatus = 'retired';
    else if (newConfidenceLevel >= 71) newStatus = 'mastered';
    else if (newConfidenceLevel >= 41) newStatus = 'familiar';
    else if (newConfidenceLevel >= 21) newStatus = 'learning';
    
    // Calculate next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
    const nextReviewDateStr = nextReviewDate.toISOString().split('T')[0];
    
    // Update database
    await db.runAsync(`
      UPDATE user_word_progress SET
        status = ?,
        confidence_level = ?,
        times_shown = ?,
        times_correct = ?,
        times_incorrect = ?,
        consecutive_correct = ?,
        ease_factor = ?,
        interval_days = ?,
        next_review_date = ?,
        last_reviewed_at = datetime('now')
      WHERE word_id = ?
    `, [
      newStatus,
      newConfidenceLevel,
      newTimesShown,
      newTimesCorrect,
      newTimesIncorrect,
      newConsecutiveCorrect,
      newEaseFactor,
      newInterval,
      nextReviewDateStr,
      wordId
    ]);
    
    return {
      status: newStatus,
      confidenceLevel: newConfidenceLevel,
      interval: newInterval,
      isCorrect
    };
  } catch (error) {
    console.error('Error updating word progress:', error);
    throw error;
  }
};

// Get user statistics
export const getUserStatistics = async () => {
  try {
    const stats = await db.getFirstAsync(`
      SELECT 
        COUNT(CASE WHEN status != 'new' THEN 1 END) as words_learned,
        COUNT(CASE WHEN status = 'mastered' OR status = 'retired' THEN 1 END) as words_mastered,
        SUM(times_shown) as total_reviews,
        AVG(CASE WHEN times_shown > 0 THEN (times_correct * 100.0 / times_shown) END) as avg_accuracy
      FROM user_word_progress
    `);
    
    const sessions = await db.getFirstAsync(`
      SELECT COUNT(*) as session_count
      FROM sessions
      WHERE completed_at IS NOT NULL
    `);
    
    // Initialize user_statistics if it doesn't exist
    await db.runAsync(`
      INSERT OR IGNORE INTO user_statistics (id, current_streak_days, longest_streak_days)
      VALUES (1, 0, 0)
    `);
    const userStats = await db.getFirstAsync('SELECT * FROM user_statistics WHERE id = 1');
    
    return {
      wordsLearned: stats.words_learned || 0,
      wordsMastered: stats.words_mastered || 0,
      totalReviews: stats.total_reviews || 0,
      avgAccuracy: stats.avg_accuracy || 0,
      sessionsCompleted: sessions.session_count || 0,
      currentStreak: userStats.current_streak_days || 0,
      longestStreak: userStats.longest_streak_days || 0,
      lastActivityDate: userStats.last_activity_date
    };
  } catch (error) {
    console.error('Error getting user statistics:', error);
    return {
      wordsLearned: 0,
      wordsMastered: 0,
      totalReviews: 0,
      avgAccuracy: 0,
      sessionsCompleted: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null
    };
  }
};

// Create a new session
export const createSession = async () => {
  try {
    const sessionId = `session_${Date.now()}`;
    
    await db.runAsync(
      'INSERT INTO sessions (id) VALUES (?)',
      [sessionId]
    );
    
    return sessionId;
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
};

// Complete a session
export const completeSession = async (sessionId, wordsReviewed, correctAnswers) => {
  try {
    const accuracy = wordsReviewed > 0 ? (correctAnswers / wordsReviewed) * 100 : 0;
    
    await db.runAsync(`
      UPDATE sessions SET
        completed_at = datetime('now'),
        words_reviewed = ?,
        correct_answers = ?,
        accuracy = ?
      WHERE id = ?
    `, [wordsReviewed, correctAnswers, accuracy, sessionId]);
    
    // Update streak
    await db.runAsync(`
      INSERT OR IGNORE INTO user_statistics (id, current_streak_days, longest_streak_days)
      VALUES (1, 0, 0)
    `);
    const userStats = await db.getFirstAsync('SELECT * FROM user_statistics WHERE id = 1');
    
    const today = new Date().toISOString().split('T')[0];
    const oldStreak = userStats.current_streak_days;
    const streakDiff = calculateStreak(userStats.last_activity_date);
    
    let newStreak = oldStreak;
    if (streakDiff === -1) {
      // Streak broken, reset to 1
      newStreak = 1;
    } else if (streakDiff === 1) {
      // New day, increment streak
      newStreak = oldStreak + 1;
    } else {
      // Same day, keep current streak (or start at 1 if first time)
      newStreak = oldStreak === 0 ? 1 : oldStreak;
    }
    
    const newLongestStreak = Math.max(newStreak, userStats.longest_streak_days);
    
    await db.runAsync(`
      UPDATE user_statistics SET
        current_streak_days = ?,
        longest_streak_days = ?,
        last_activity_date = ?,
        updated_at = datetime('now')
      WHERE id = 1
    `, [newStreak, newLongestStreak, today]);
    
    // Check for milestone
    const milestone = checkMilestoneReached(oldStreak, newStreak);

    // Award streak XP (fire-and-forget)
    if (streakDiff === 1) {
      awardXp('daily_streak_maintained', today).catch(() => {});
    }
    if (milestone) {
      const milestoneType = `streak_milestone_${milestone.days}`;
      awardXp(milestoneType, String(milestone.days)).catch(() => {});
    }
    
    // Update daily challenge progress (fire-and-forget)
    updateChallengeProgress(wordsReviewed, correctAnswers, accuracy, 0).catch(() => {});

    // Background sync: push changed progress to the backend.
    // Fire-and-forget so it never blocks the UI or breaks the session.
    syncProgressToServer().catch(() => {});

    return { 
      accuracy, 
      wordsReviewed, 
      correctAnswers,
      streak: {
        current: newStreak,
        longest: newLongestStreak,
        milestone: milestone
      }
    };
  } catch (error) {
    console.error('Error completing session:', error);
    throw error;
  }
};

// Get all categories
export const getAllCategories = async () => {
  try {
    const categories = await db.getAllAsync('SELECT * FROM categories ORDER BY name ASC');
    return categories;
  } catch (error) {
    console.error('Error getting categories:', error);
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Shared aggregate query helpers
// Used by Mistake Journal, Analytics, Weak Area Detection, Daily Challenges
// ---------------------------------------------------------------------------

// Get words with the highest error rate
export const getWordsWithHighestErrorRate = async (limit = 50) => {
  try {
    const words = await db.getAllAsync(`
      SELECT w.*, p.times_incorrect, p.times_correct, p.times_shown,
             p.status, p.confidence_level, p.consecutive_correct,
             p.ease_factor, p.interval_days, p.last_reviewed_at,
             CASE WHEN p.times_shown > 0
               THEN ROUND((p.times_incorrect * 100.0 / p.times_shown), 1)
               ELSE 0
             END as error_rate
      FROM words w
      INNER JOIN user_word_progress p ON w.id = p.word_id
      WHERE p.times_incorrect > 0
      ORDER BY error_rate DESC, p.times_incorrect DESC
      LIMIT ?
    `, [limit]);
    return words;
  } catch (error) {
    console.error('Error getting words with highest error rate:', error);
    return [];
  }
};

// Get accuracy grouped by CEFR level
export const getAccuracyByCefrLevel = async () => {
  try {
    const rows = await db.getAllAsync(`
      SELECT w.cefr_level,
             COUNT(*) as total_words,
             COUNT(CASE WHEN p.status = 'mastered' OR p.status = 'retired' THEN 1 END) as mastered,
             COUNT(CASE WHEN p.status = 'learning' OR p.status = 'familiar' THEN 1 END) as learning,
             SUM(p.times_correct) as total_correct,
             SUM(p.times_shown) as total_shown,
             CASE WHEN SUM(p.times_shown) > 0
               THEN ROUND((SUM(p.times_correct) * 100.0 / SUM(p.times_shown)), 1)
               ELSE 0
             END as accuracy
      FROM words w
      INNER JOIN user_word_progress p ON w.id = p.word_id
      WHERE p.times_shown > 0
      GROUP BY w.cefr_level
      ORDER BY
        CASE w.cefr_level
          WHEN 'A1' THEN 1 WHEN 'A2' THEN 2 WHEN 'B1' THEN 3
          WHEN 'B2' THEN 4 WHEN 'C1' THEN 5 WHEN 'C2' THEN 6
          ELSE 7
        END
    `);
    return rows;
  } catch (error) {
    console.error('Error getting accuracy by CEFR level:', error);
    return [];
  }
};

// Get accuracy grouped by category
export const getAccuracyByCategory = async () => {
  try {
    const rows = await db.getAllAsync(`
      SELECT w.category,
             c.name as category_name, c.icon as category_icon,
             COUNT(*) as total_words,
             COUNT(CASE WHEN p.status = 'mastered' OR p.status = 'retired' THEN 1 END) as mastered,
             SUM(p.times_correct) as total_correct,
             SUM(p.times_shown) as total_shown,
             CASE WHEN SUM(p.times_shown) > 0
               THEN ROUND((SUM(p.times_correct) * 100.0 / SUM(p.times_shown)), 1)
               ELSE 0
             END as accuracy
      FROM words w
      INNER JOIN user_word_progress p ON w.id = p.word_id
      LEFT JOIN categories c ON w.category = c.id
      WHERE p.times_shown > 0
      GROUP BY w.category
      HAVING COUNT(*) >= 3
      ORDER BY accuracy ASC
    `);
    return rows;
  } catch (error) {
    console.error('Error getting accuracy by category:', error);
    return [];
  }
};

// Get daily review counts for the last N days
export const getDailyReviewCounts = async (days = 30) => {
  try {
    const rows = await db.getAllAsync(`
      SELECT DATE(completed_at) as date,
             COUNT(*) as sessions,
             SUM(words_reviewed) as words_reviewed,
             SUM(correct_answers) as correct_answers,
             AVG(accuracy) as avg_accuracy,
             SUM(new_words_introduced) as new_words
      FROM sessions
      WHERE completed_at IS NOT NULL
        AND DATE(completed_at) >= DATE('now', '-' || ? || ' days')
      GROUP BY DATE(completed_at)
      ORDER BY date ASC
    `, [days]);
    return rows;
  } catch (error) {
    console.error('Error getting daily review counts:', error);
    return [];
  }
};

// Get word progress distribution (how many words at each status)
export const getWordProgressDistribution = async () => {
  try {
    const rows = await db.getAllAsync(`
      SELECT
        COALESCE(p.status, 'unseen') as status,
        COUNT(*) as count
      FROM words w
      LEFT JOIN user_word_progress p ON w.id = p.word_id
      GROUP BY COALESCE(p.status, 'unseen')
      ORDER BY
        CASE COALESCE(p.status, 'unseen')
          WHEN 'unseen' THEN 0 WHEN 'new' THEN 1 WHEN 'learning' THEN 2
          WHEN 'familiar' THEN 3 WHEN 'mastered' THEN 4 WHEN 'retired' THEN 5
          ELSE 6
        END
    `);
    return rows;
  } catch (error) {
    console.error('Error getting word progress distribution:', error);
    return [];
  }
};

// Get words due for review count (used by notifications and daily challenge)
export const getWordsDueCount = async () => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await db.getFirstAsync(`
      SELECT COUNT(*) as count
      FROM user_word_progress
      WHERE next_review_date <= ?
    `, [today]);
    return result?.count || 0;
  } catch (error) {
    console.error('Error getting words due count:', error);
    return 0;
  }
};
