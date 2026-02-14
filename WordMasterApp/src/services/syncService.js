/**
 * Sync Service
 * 
 * Handles synchronization between local database and backend API
 * - Progress sync
 * - Settings sync
 * - Auto-sync on interval
 */

import api from './api';
import { exportProgress, importProgress } from './exportService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SYNC_INTERVAL_KEY = 'sync_interval';
const LAST_SYNC_KEY = 'last_sync_timestamp';

class SyncService {
  constructor() {
    this.syncInterval = null;
    this.isSyncing = false;
  }

  /**
   * Sync all user progress to backend
   */
  async syncProgress() {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping...');
      return { success: false, error: 'Sync in progress' };
    }

    this.isSyncing = true;

    try {
      // Export local progress
      const localData = await exportProgress();
      
      if (!localData || !localData.data) {
        throw new Error('Failed to export local progress');
      }

      // Prepare sync payload
      const payload = {
        progress: this.formatProgressForSync(localData.data.progress),
        sessions: this.formatSessionsForSync(localData.data.sessions),
        achievements: this.formatAchievementsForSync(localData.data.achievements),
        settings: await this.getSettings(),
      };

      // Send to backend
      const { data } = await api.post('/progress/sync', payload);

      // Update last sync timestamp
      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

      console.log('✅ Progress synced successfully');
      
      return { 
        success: true, 
        synced: data.synced,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Sync failed:', error);
      return { 
        success: false, 
        error: error.message || 'Sync failed',
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Download progress from backend
   */
  async downloadProgress() {
    try {
      const { data } = await api.get('/progress/export');
      
      if (data && data.data) {
        // Import to local database
        await importProgress(data.data, 'merge');
        
        console.log('✅ Progress downloaded successfully');
        return { success: true };
      }
      
      return { success: false, error: 'No data received' };
    } catch (error) {
      console.error('Download failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user statistics from backend
   */
  async getStats() {
    try {
      const { data } = await api.get('/progress/stats');
      return { stats: data.stats, error: null };
    } catch (error) {
      console.error('Get stats failed:', error);
      return { stats: null, error: error.message };
    }
  }

  /**
   * Get user settings from backend
   */
  async getSettings() {
    try {
      // Get from local storage
      const cefrLevel = await AsyncStorage.getItem('cefrLevel');
      const knownLanguage = await AsyncStorage.getItem('knownLanguage');
      const learningLanguage = await AsyncStorage.getItem('learningLanguage');
      const ttsEnabled = await AsyncStorage.getItem('ttsEnabled');
      const ttsRate = await AsyncStorage.getItem('ttsRate');
      const dailyGoal = await AsyncStorage.getItem('dailyGoal');

      return {
        cefrLevel: cefrLevel || 'A1',
        knownLanguage: knownLanguage || 'en',
        learningLanguage: learningLanguage || 'es',
        ttsEnabled: ttsEnabled !== 'false',
        ttsRate: parseFloat(ttsRate) || 0.75,
        dailyGoal: parseInt(dailyGoal) || 20,
        notificationsEnabled: true,
        theme: 'light',
      };
    } catch (error) {
      console.error('Get settings error:', error);
      return {};
    }
  }

  /**
   * Update settings on backend
   */
  async updateSettings(settings) {
    try {
      const { data } = await api.put('/progress/settings', settings);
      
      // Also save locally
      if (settings.cefrLevel) {
        await AsyncStorage.setItem('cefrLevel', settings.cefrLevel);
      }
      if (settings.knownLanguage) {
        await AsyncStorage.setItem('knownLanguage', settings.knownLanguage);
      }
      if (settings.learningLanguage) {
        await AsyncStorage.setItem('learningLanguage', settings.learningLanguage);
      }
      
      return { settings: data.settings, error: null };
    } catch (error) {
      console.error('Update settings error:', error);
      return { settings: null, error: error.message };
    }
  }

  /**
   * Enable auto-sync
   */
  async enableAutoSync(intervalMinutes = 5) {
    // Clear existing interval
    this.disableAutoSync();

    // Save interval preference
    await AsyncStorage.setItem(SYNC_INTERVAL_KEY, String(intervalMinutes));

    // Set up new interval
    this.syncInterval = setInterval(() => {
      console.log('Auto-sync triggered');
      this.syncProgress();
    }, intervalMinutes * 60 * 1000);

    console.log(`✅ Auto-sync enabled (every ${intervalMinutes} minutes)`);
  }

  /**
   * Disable auto-sync
   */
  disableAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('❌ Auto-sync disabled');
    }
  }

  /**
   * Get last sync timestamp
   */
  async getLastSyncTime() {
    try {
      const timestamp = await AsyncStorage.getItem(LAST_SYNC_KEY);
      return timestamp ? new Date(timestamp) : null;
    } catch (error) {
      return null;
    }
  }

  // Helper methods to format data for backend

  formatProgressForSync(progress) {
    if (!Array.isArray(progress)) return [];
    
    return progress.map((item) => ({
      wordId: String(item.word_id),
      status: item.status,
      confidenceLevel: item.confidence_level,
      consecutiveCorrect: item.consecutive_correct,
      easeFactor: item.ease_factor,
      intervalDays: item.interval_days,
      nextReviewDate: item.next_review_date,
      timesShown: item.times_shown,
      timesCorrect: item.times_correct,
      timesIncorrect: item.times_incorrect,
      lastReviewed: item.last_reviewed,
    }));
  }

  formatSessionsForSync(sessions) {
    if (!Array.isArray(sessions)) return [];
    
    return sessions.map((session) => ({
      startTime: session.start_time,
      endTime: session.end_time,
      wordsReviewed: session.words_reviewed,
      correctAnswers: session.correct_answers,
      accuracy: session.accuracy,
      data: session.session_data || {},
    }));
  }

  formatAchievementsForSync(achievements) {
    if (!Array.isArray(achievements)) return [];
    
    return achievements.map((achievement) => ({
      achievementId: achievement.achievement_id,
      progress: achievement.progress || 100,
    }));
  }
}

export default new SyncService();
