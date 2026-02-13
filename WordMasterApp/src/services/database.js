import * as SQLite from 'expo-sqlite';
// import wordsData from '../data/words.json'; // Not needed - using pre-populated database
import categoriesData from '../data/categories.json';
import { calculateStreak, checkMilestoneReached } from './streakService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { importAllWords } from './importWords';
import { initAchievementTables } from './achievementDatabase';

const DB_NAME = 'wordmaster.db';

// Open database
const db = SQLite.openDatabaseSync(DB_NAME);

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
    `);
    
    // Check if words are already loaded
    let wordCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM words');
    
    if (wordCount.count === 0) {
      console.log('📥 Database is empty. Importing 30,000 words...');
      await importAllWords();
      
      // Check count again
      wordCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM words');
      console.log(`✅ Import complete! Database now contains ${wordCount.count.toLocaleString()} words`);
    } else {
      console.log(`✅ Database contains ${wordCount.count.toLocaleString()} words`);
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
    
    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

// Get words due for review
export const getWordsDueForReview = async (limit = 20) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Get user's preferences
    const cefrLevel = await AsyncStorage.getItem('cefrLevel') || 'A1';
    const knownLanguage = await AsyncStorage.getItem('knownLanguage') || 'en';
    const learningLanguage = await AsyncStorage.getItem('learningLanguage') || 'es';
    
    const words = await db.getAllAsync(`
      SELECT w.*, p.id as progress_id, p.status, p.confidence_level,
             p.consecutive_correct, p.ease_factor, p.interval_days,
             p.times_shown, p.times_correct, p.times_incorrect
      FROM words w
      LEFT JOIN user_word_progress p ON w.id = p.word_id
      WHERE w.cefr_level = ?
        AND w.source_lang = ?
        AND w.target_lang = ?
        AND w.word NOT LIKE '[%'
        AND w.translation NOT LIKE '[%'
        AND (p.next_review_date IS NULL OR p.next_review_date <= ?)
      ORDER BY 
        CASE 
          WHEN p.next_review_date IS NULL THEN 0
          WHEN p.next_review_date < ? THEN 1
          ELSE 2
        END,
        p.next_review_date ASC,
        w.frequency_rank ASC
      LIMIT ?
    `, [cefrLevel, knownLanguage, learningLanguage, today, today, limit]);
    
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
export const getNewWords = async (limit = 5) => {
  try {
    // Get user's preferences
    const cefrLevel = await AsyncStorage.getItem('cefrLevel') || 'A1';
    const knownLanguage = await AsyncStorage.getItem('knownLanguage') || 'en';
    const learningLanguage = await AsyncStorage.getItem('learningLanguage') || 'es';
    
    const words = await db.getAllAsync(`
      SELECT w.*
      FROM words w
      LEFT JOIN user_word_progress p ON w.id = p.word_id
      WHERE p.id IS NULL
        AND w.cefr_level = ?
        AND w.source_lang = ?
        AND w.target_lang = ?
        AND w.word NOT LIKE '[%'
        AND w.translation NOT LIKE '[%'
      ORDER BY w.frequency_rank ASC, RANDOM()
      LIMIT ?
    `, [cefrLevel, knownLanguage, learningLanguage, limit]);
    
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
    let userStats = await db.getFirstAsync('SELECT * FROM user_statistics WHERE id = 1');
    if (!userStats) {
      await db.runAsync(`
        INSERT INTO user_statistics (id, current_streak_days, longest_streak_days)
        VALUES (1, 0, 0)
      `);
      userStats = { current_streak_days: 0, longest_streak_days: 0, last_activity_date: null };
    }
    
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
    let userStats = await db.getFirstAsync('SELECT * FROM user_statistics WHERE id = 1');
    if (!userStats) {
      await db.runAsync(`
        INSERT INTO user_statistics (id, current_streak_days, longest_streak_days)
        VALUES (1, 0, 0)
      `);
      userStats = { current_streak_days: 0, longest_streak_days: 0, last_activity_date: null };
    }
    
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

// Get category by ID
export const getCategoryById = async (categoryId) => {
  try {
    const category = await db.getFirstAsync(
      'SELECT * FROM categories WHERE id = ?',
      [categoryId]
    );
    return category;
  } catch (error) {
    console.error('Error getting category:', error);
    throw error;
  }
};

// Get words by category
export const getWordsByCategory = async (categoryId, limit = 100) => {
  try {
    const words = await db.getAllAsync(`
      SELECT w.*, p.status, p.confidence_level, p.times_shown
      FROM words w
      LEFT JOIN user_word_progress p ON w.id = p.word_id
      WHERE w.category = ?
      ORDER BY w.difficulty ASC, w.word ASC
      LIMIT ?
    `, [categoryId, limit]);
    
    return words;
  } catch (error) {
    console.error('Error getting words by category:', error);
    throw error;
  }
};

// Get words by difficulty range
export const getWordsByDifficulty = async (minDiff = 1, maxDiff = 10, limit = 100) => {
  try {
    const words = await db.getAllAsync(`
      SELECT w.*, p.status, p.confidence_level
      FROM words w
      LEFT JOIN user_word_progress p ON w.id = p.word_id
      WHERE w.difficulty BETWEEN ? AND ?
      ORDER BY w.difficulty ASC, w.word ASC
      LIMIT ?
    `, [minDiff, maxDiff, limit]);
    
    return words;
  } catch (error) {
    console.error('Error getting words by difficulty:', error);
    throw error;
  }
};

// Search words
export const searchWords = async (searchTerm) => {
  try {
    const term = `%${searchTerm}%`;
    const words = await db.getAllAsync(`
      SELECT w.*, p.status, p.confidence_level
      FROM words w
      LEFT JOIN user_word_progress p ON w.id = p.word_id
      WHERE w.word LIKE ? OR w.translation LIKE ?
      ORDER BY w.word ASC
      LIMIT 50
    `, [term, term]);
    
    return words;
  } catch (error) {
    console.error('Error searching words:', error);
    throw error;
  }
};

// Get category statistics
export const getCategoryStats = async () => {
  try {
    const stats = await db.getAllAsync(`
      SELECT 
        w.category,
        c.name as category_name,
        c.icon as category_icon,
        c.color as category_color,
        COUNT(w.id) as total_words,
        COUNT(CASE WHEN p.status = 'mastered' OR p.status = 'retired' THEN 1 END) as mastered_words,
        COUNT(CASE WHEN p.status IS NOT NULL THEN 1 END) as started_words
      FROM words w
      LEFT JOIN categories c ON w.category = c.id
      LEFT JOIN user_word_progress p ON w.id = p.word_id
      GROUP BY w.category, c.name, c.icon, c.color
      ORDER BY c.name ASC
    `);
    
    return stats;
  } catch (error) {
    console.error('Error getting category stats:', error);
    throw error;
  }
};

// Get mastered words count in a category
export const getMasteredWordsInCategory = async (categoryId) => {
  try {
    const result = await db.getFirstAsync(`
      SELECT COUNT(*) as count
      FROM words w
      INNER JOIN user_word_progress p ON w.id = p.word_id
      WHERE w.category = ?
        AND (p.status = 'mastered' OR p.status = 'retired')
    `, [categoryId]);
    
    return result?.count || 0;
  } catch (error) {
    console.error('Error getting mastered words in category:', error);
    throw error;
  }
};

// Get total word count
export const getTotalWordCount = async () => {
  try {
    const result = await db.getFirstAsync('SELECT COUNT(*) as count FROM words');
    return result?.count || 0;
  } catch (error) {
    console.error('Error getting total word count:', error);
    throw error;
  }
};

export default {
  initDatabase,
  getWordsDueForReview,
  getNewWords,
  updateWordProgress,
  getUserStatistics,
  createSession,
  completeSession,
  getAllCategories,
  getCategoryById,
  getWordsByCategory,
  getWordsByDifficulty,
  searchWords,
  getCategoryStats,
  getMasteredWordsInCategory,
  getTotalWordCount
};
