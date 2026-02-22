import {
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
} from './achievementDatabase';
import { getUserStatistics } from './database';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Achievement Service
 * Handles all achievement unlock logic and progress tracking
 */

class AchievementService {
  constructor() {
    this.sessionStartTime = null;
    this.sessionWordCount = 0;
    this.sessionCorrectCount = 0;
    this.currentSessionId = null;
    this.consecutiveCorrect = 0;
    this.maxConsecutiveInSession = 0;
  }

  /**
   * Start tracking a new session
   */
  async startSession(sessionId) {
    this.currentSessionId = sessionId;
    this.sessionStartTime = new Date().toISOString();
    this.sessionWordCount = 0;
    this.sessionCorrectCount = 0;
    this.consecutiveCorrect = 0;
    this.maxConsecutiveInSession = 0;

    // Log session metadata
    await logSessionMetadata(sessionId, {
      startedAt: this.sessionStartTime
    });

    console.log('🎯 Achievement tracking started for session:', sessionId);
  }

  /**
   * Track word practice (called after each word)
   */
  async trackWordPractice(wordId, categoryId, isCorrect) {
    try {
      this.sessionWordCount++;
      
      if (isCorrect) {
        this.sessionCorrectCount++;
        this.consecutiveCorrect++;
        this.maxConsecutiveInSession = Math.max(
          this.maxConsecutiveInSession,
          this.consecutiveCorrect
        );
      } else {
        this.consecutiveCorrect = 0;
      }

      // Log category practice for category explorer achievement
      if (categoryId) {
        await logCategoryPractice(categoryId, wordId);
      }

      // Check for immediate achievements (after each word)
      await this.checkImmediateAchievements();
    } catch (error) {
      console.error('Error tracking word practice:', error);
    }
  }

  /**
   * End session and check for session-based achievements
   */
  async endSession() {
    try {
      if (!this.currentSessionId || !this.sessionStartTime) {
        console.warn('No active session to end');
        return [];
      }

      const completedAt = new Date().toISOString();
      const durationMs = new Date(completedAt) - new Date(this.sessionStartTime);
      const durationSeconds = Math.floor(durationMs / 1000);

      // Update session metadata
      await updateSessionMetadata(
        this.currentSessionId,
        completedAt,
        durationSeconds,
        this.sessionWordCount,
        this.sessionCorrectCount
      );

      console.log(`📊 Session ended: ${this.sessionWordCount} words, ${this.sessionCorrectCount} correct, ${durationSeconds}s`);

      // Check for session-based achievements
      const newAchievements = await this.checkSessionAchievements(
        this.sessionWordCount,
        this.sessionCorrectCount,
        durationSeconds
      );

      // Reset session tracking
      this.currentSessionId = null;
      this.sessionStartTime = null;
      this.sessionWordCount = 0;
      this.sessionCorrectCount = 0;
      this.consecutiveCorrect = 0;
      this.maxConsecutiveInSession = 0;

      return newAchievements;
    } catch (error) {
      console.error('Error ending session:', error);
      return [];
    }
  }

  /**
   * Check achievements that can be unlocked immediately (during session)
   */
  async checkImmediateAchievements() {
    try {
      const newlyUnlocked = [];

      // Check consecutive correct achievements
      if (this.consecutiveCorrect === 10) {
        const unlocked = await unlockAchievement('perfect_10');
        if (unlocked) newlyUnlocked.push('perfect_10');
      }
      if (this.consecutiveCorrect === 20) {
        const unlocked = await unlockAchievement('perfect_20');
        if (unlocked) newlyUnlocked.push('perfect_20');
      }

      // Check first word achievement
      if (this.sessionWordCount === 1) {
        const stats = await getUserStatistics();
        if (stats.totalReviews === 1) {
          const unlocked = await unlockAchievement('first_word');
          if (unlocked) newlyUnlocked.push('first_word');
        }
      }

      return newlyUnlocked;
    } catch (error) {
      console.error('Error checking immediate achievements:', error);
      return [];
    }
  }

  /**
   * Check session-based achievements (called when session ends)
   */
  async checkSessionAchievements(wordCount, correctCount, durationSeconds) {
    try {
      const newlyUnlocked = [];
      const stats = await getUserStatistics();
      const hourOfDay = new Date().getHours();

      // First session achievement
      if (stats.sessionsCompleted === 1) {
        const unlocked = await unlockAchievement('first_session');
        if (unlocked) newlyUnlocked.push('first_session');
      }

      // Perfect session (100% accuracy, 20+ words)
      if (wordCount >= 20 && correctCount === wordCount) {
        const unlocked = await unlockAchievement('session_100_percent');
        if (unlocked) newlyUnlocked.push('session_100_percent');
      }

      // Speed achievements
      // Quick Learner: 20 words in under 10 minutes
      if (wordCount >= 20 && durationSeconds <= 600) {
        const unlocked = await unlockAchievement('speed_20_in_10min');
        if (unlocked) newlyUnlocked.push('speed_20_in_10min');
      }

      // Speed Demon: 50 words in one session
      if (wordCount >= 50) {
        const unlocked = await unlockAchievement('speed_50_in_session');
        if (unlocked) newlyUnlocked.push('speed_50_in_session');
      }

      // Marathon Runner: 100 words in one session
      if (wordCount >= 100) {
        const unlocked = await unlockAchievement('speed_100_in_session');
        if (unlocked) newlyUnlocked.push('speed_100_in_session');
      }

      // Early Bird: Session before 8 AM
      if (hourOfDay < 8) {
        const unlocked = await unlockAchievement('morning_learner');
        if (unlocked) newlyUnlocked.push('morning_learner');
      }

      // Night Owl: Session between midnight and 5 AM
      if (hourOfDay >= 0 && hourOfDay < 5) {
        const unlocked = await unlockAchievement('night_owl');
        if (unlocked) newlyUnlocked.push('night_owl');
      }

      return newlyUnlocked;
    } catch (error) {
      console.error('Error checking session achievements:', error);
      return [];
    }
  }

  /**
   * Check all achievements (comprehensive check)
   * Call this periodically or after major events
   */
  async checkAllAchievements() {
    try {
      const newlyUnlocked = [];
      const stats = await getUserStatistics();

      // Streak achievements
      const streakAchievements = [
        { id: 'streak_3', value: 3 },
        { id: 'streak_7', value: 7 },
        { id: 'streak_14', value: 14 },
        { id: 'streak_30', value: 30 },
        { id: 'streak_100', value: 100 },
        { id: 'streak_365', value: 365 }
      ];

      for (const ach of streakAchievements) {
        if (stats.currentStreak >= ach.value) {
          const unlocked = await unlockAchievement(ach.id);
          if (unlocked) newlyUnlocked.push(ach.id);
        }
        // Update progress for next tier
        await updateAchievementProgress(ach.id, stats.currentStreak, ach.value);
      }

      // Word mastery achievements
      const masteryAchievements = [
        { id: 'words_10', value: 10 },
        { id: 'words_50', value: 50 },
        { id: 'words_100', value: 100 },
        { id: 'words_250', value: 250 },
        { id: 'words_500', value: 500 },
        { id: 'words_1000', value: 1000 },
        { id: 'words_5000', value: 5000 }
      ];

      for (const ach of masteryAchievements) {
        if (stats.wordsMastered >= ach.value) {
          const unlocked = await unlockAchievement(ach.id);
          if (unlocked) newlyUnlocked.push(ach.id);
        }
        // Update progress
        await updateAchievementProgress(ach.id, stats.wordsMastered, ach.value);
      }

      // Accuracy achievement (90%+ over 100 words)
      if (stats.totalReviews >= 100 && stats.avgAccuracy >= 90) {
        const unlocked = await unlockAchievement('avg_accuracy_90');
        if (unlocked) newlyUnlocked.push('avg_accuracy_90');
      }
      if (stats.totalReviews >= 10) {
        await updateAchievementProgress('avg_accuracy_90', stats.avgAccuracy, 90);
      }

      // Category explorer achievement
      const categoriesCount = await getUniqueCategoriesPracticed();
      if (categoriesCount >= 10) {
        const unlocked = await unlockAchievement('categories_10');
        if (unlocked) newlyUnlocked.push('categories_10');
      }
      await updateAchievementProgress('categories_10', categoriesCount, 10);

      // First day achievement
      if (stats.currentStreak >= 1) {
        const unlocked = await unlockAchievement('first_day');
        if (unlocked) newlyUnlocked.push('first_day');
      }

      console.log(`✅ Achievement check complete. Newly unlocked: ${newlyUnlocked.length}`);
      return newlyUnlocked;
    } catch (error) {
      console.error('Error checking all achievements:', error);
      return [];
    }
  }

  /**
   * Check language-related achievements
   * Call when user changes language settings
   */
  async checkLanguageAchievements() {
    try {
      const newlyUnlocked = [];
      
      // Get list of languages practiced (from AsyncStorage history)
      const languagesKey = 'languages_practiced';
      const languagesStr = await AsyncStorage.getItem(languagesKey);
      const languages = languagesStr ? JSON.parse(languagesStr) : [];
      const languageCount = languages.length;

      // Polyglot achievements
      if (languageCount >= 2) {
        const unlocked = await unlockAchievement('languages_2');
        if (unlocked) newlyUnlocked.push('languages_2');
      }
      if (languageCount >= 3) {
        const unlocked = await unlockAchievement('languages_3');
        if (unlocked) newlyUnlocked.push('languages_3');
      }
      if (languageCount >= 5) {
        const unlocked = await unlockAchievement('languages_5');
        if (unlocked) newlyUnlocked.push('languages_5');
      }

      // Update progress
      await updateAchievementProgress('languages_2', languageCount, 2);
      await updateAchievementProgress('languages_3', languageCount, 3);
      await updateAchievementProgress('languages_5', languageCount, 5);

      return newlyUnlocked;
    } catch (error) {
      console.error('Error checking language achievements:', error);
      return [];
    }
  }

  /**
   * Track language practice (call when user practices a new language pair)
   */
  async trackLanguagePractice(sourceLang, targetLang) {
    try {
      const languagePair = `${sourceLang}-${targetLang}`;
      const languagesKey = 'languages_practiced';
      
      const languagesStr = await AsyncStorage.getItem(languagesKey);
      const languages = languagesStr ? JSON.parse(languagesStr) : [];
      
      if (!languages.includes(languagePair)) {
        languages.push(languagePair);
        await AsyncStorage.setItem(languagesKey, JSON.stringify(languages));
        
        // Check language achievements
        await this.checkLanguageAchievements();
      }
    } catch (error) {
      console.error('Error tracking language practice:', error);
    }
  }

  /**
   * Check settings-related achievements
   */
  async checkSettingsAchievements() {
    try {
      const unlocked = await unlockAchievement('settings_visited');
      return unlocked ? ['settings_visited'] : [];
    } catch (error) {
      console.error('Error checking settings achievements:', error);
      return [];
    }
  }

  /**
   * Check comeback achievement (returning after long absence)
   */
  async checkComebackAchievement(lastActivityDate) {
    try {
      if (!lastActivityDate) return [];

      const daysSinceLastActivity = Math.floor(
        (new Date() - new Date(lastActivityDate)) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastActivity >= 30) {
        const unlocked = await unlockAchievement('comeback_kid');
        return unlocked ? ['comeback_kid'] : [];
      }

      return [];
    } catch (error) {
      console.error('Error checking comeback achievement:', error);
      return [];
    }
  }

  /**
   * Get all pending notifications
   */
  async getPendingNotifications() {
    try {
      return await getPendingAchievements();
    } catch (error) {
      console.error('Error getting pending notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as shown
   */
  async markNotificationShown(achievementId) {
    try {
      await markAchievementNotificationShown(achievementId);
    } catch (error) {
      console.error('Error marking notification shown:', error);
    }
  }

  /**
   * Get achievement statistics
   */
  async getStats() {
    try {
      return await getAchievementStats();
    } catch (error) {
      console.error('Error getting achievement stats:', error);
      return {
        total: 0,
        unlocked: 0,
        totalPoints: 0,
        percentComplete: 0
      };
    }
  }

  /**
   * Get all user achievements with unlock status
   */
  async getAllUserAchievements() {
    try {
      return await getUserAchievements();
    } catch (error) {
      console.error('Error getting user achievements:', error);
      return [];
    }
  }

  /**
   * Get total points earned
   */
  async getTotalPoints() {
    try {
      return await getTotalAchievementPoints();
    } catch (error) {
      console.error('Error getting total points:', error);
      return 0;
    }
  }
}

// Export singleton instance
const achievementService = new AchievementService();
export default achievementService;
