/**
 * Export/Import Service
 * Handles backup and restore of user progress
 */

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import db from './db';

/**
 * Export user progress to JSON
 * @returns {Object} Export data with version, timestamp, and all user data
 */
export const exportProgress = async () => {
  try {
    console.log('📤 Starting progress export...');

    // Get user progress
    const progress = await db.getAllAsync(
      'SELECT * FROM user_word_progress ORDER BY last_reviewed_at DESC'
    );

    // Get session history
    const sessions = await db.getAllAsync(
      'SELECT * FROM sessions ORDER BY started_at DESC LIMIT 100'
    );

    // Get achievement progress
    const achievements = await db.getAllAsync(
      'SELECT * FROM user_achievements ORDER BY unlocked_at DESC'
    );

    // Get user settings from AsyncStorage
    const settings = {
      cefrLevel: await AsyncStorage.getItem('cefrLevel'),
      knownLanguage: await AsyncStorage.getItem('knownLanguage'),
      learningLanguage: await AsyncStorage.getItem('learningLanguage'),
      tts_enabled: await AsyncStorage.getItem('tts_enabled'),
      tts_rate: await AsyncStorage.getItem('tts_rate'),
    };

    // Get statistics
    const stats = await db.getFirstAsync(`
      SELECT 
        COUNT(*) as total_words_learned,
        SUM(times_correct) as total_correct,
        SUM(times_incorrect) as total_incorrect,
        AVG(confidence_level) as avg_confidence
      FROM user_word_progress
      WHERE status != 'new'
    `);

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      appVersion: '1.0.0', // Update with actual app version
      dataTypes: ['progress', 'sessions', 'achievements', 'settings'],
      stats: {
        totalWordsLearned: stats?.total_words_learned || 0,
        totalCorrect: stats?.total_correct || 0,
        totalIncorrect: stats?.total_incorrect || 0,
        averageConfidence: stats?.avg_confidence || 0,
        progressEntries: progress.length,
        sessions: sessions.length,
        achievements: achievements.length,
      },
      data: {
        progress,
        sessions,
        achievements,
        settings,
      },
    };

    console.log('✅ Export complete:', exportData.stats);
    return exportData;
  } catch (error) {
    console.error('Error exporting progress:', error);
    throw error;
  }
};

/**
 * Export progress and save to file
 * @returns {string} File path of exported data
 */
export const exportToFile = async () => {
  try {
    const exportData = await exportProgress();
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `wordmaster_backup_${timestamp}.json`;
    const filePath = `${FileSystem.documentDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(
      filePath,
      JSON.stringify(exportData, null, 2),
      { encoding: FileSystem.EncodingType.UTF8 }
    );

    console.log('💾 Saved to:', filePath);
    return filePath;
  } catch (error) {
    console.error('Error exporting to file:', error);
    throw error;
  }
};

/**
 * Share exported backup file
 */
export const shareBackup = async () => {
  try {
    const filePath = await exportToFile();
    
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }

    await Sharing.shareAsync(filePath, {
      mimeType: 'application/json',
      dialogTitle: 'Share Wordmaster Backup',
      UTI: 'public.json',
    });

    console.log('✅ Backup shared successfully');
    return filePath;
  } catch (error) {
    console.error('Error sharing backup:', error);
    throw error;
  }
};

/**
 * Import progress from JSON data
 * @param {Object} importData - Import data object
 * @param {string} mode - 'merge' or 'replace'
 * @returns {Object} Import statistics
 */
export const importProgress = async (importData, mode = 'merge') => {
  try {
    console.log('📥 Starting progress import...');
    console.log('   Mode:', mode);
    console.log('   Version:', importData.version);

    // Validate import data
    if (!importData.version || !importData.data) {
      throw new Error('Invalid import data format');
    }

    if (importData.version !== '1.0') {
      throw new Error(`Unsupported backup version: ${importData.version}`);
    }

    const stats = {
      progressImported: 0,
      progressSkipped: 0,
      progressUpdated: 0,
      sessionsImported: 0,
      achievementsImported: 0,
    };

    // If replace mode, clear existing data
    if (mode === 'replace') {
      console.log('⚠️  Clearing existing data...');
      await db.runAsync('DELETE FROM user_word_progress');
      await db.runAsync('DELETE FROM sessions');
      await db.runAsync('DELETE FROM user_achievements');
    }

    // Import progress
    if (importData.data.progress) {
      console.log(`📊 Importing ${importData.data.progress.length} progress entries...`);
      
      for (const progressEntry of importData.data.progress) {
        try {
          if (mode === 'merge') {
            // Check if entry exists
            const existing = await db.getFirstAsync(
              'SELECT id FROM user_word_progress WHERE word_id = ?',
              [progressEntry.word_id]
            );

            if (existing) {
              // Update if imported data is newer
              await db.runAsync(`
                UPDATE user_word_progress 
                SET status = ?, confidence_level = ?, consecutive_correct = ?,
                    ease_factor = ?, interval_days = ?, next_review_date = ?,
                    times_shown = ?, times_correct = ?, times_incorrect = ?,
                    last_reviewed_at = ?
                WHERE word_id = ?
                  AND (last_reviewed_at IS NULL OR last_reviewed_at < ?)
              `, [
                progressEntry.status,
                progressEntry.confidence_level,
                progressEntry.consecutive_correct,
                progressEntry.ease_factor,
                progressEntry.interval_days,
                progressEntry.next_review_date,
                progressEntry.times_shown,
                progressEntry.times_correct,
                progressEntry.times_incorrect,
                progressEntry.last_reviewed_at,
                progressEntry.word_id,
                progressEntry.last_reviewed_at,
              ]);
              stats.progressUpdated++;
            } else {
              // Insert new entry
              await insertProgressEntry(progressEntry);
              stats.progressImported++;
            }
          } else {
            // Replace mode - just insert
            await insertProgressEntry(progressEntry);
            stats.progressImported++;
          }
        } catch (error) {
          console.warn('Skipping progress entry:', error.message);
          stats.progressSkipped++;
        }
      }
    }

    // Import sessions
    if (importData.data.sessions) {
      console.log(`📚 Importing ${importData.data.sessions.length} sessions...`);
      
      for (const session of importData.data.sessions) {
        try {
          await db.runAsync(`
            INSERT OR IGNORE INTO sessions 
            (id, started_at, completed_at, words_reviewed, correct_answers, accuracy)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            session.id,
            session.started_at,
            session.completed_at,
            session.words_reviewed,
            session.correct_answers,
            session.accuracy,
          ]);
          stats.sessionsImported++;
        } catch (error) {
          console.warn('Skipping session:', error.message);
        }
      }
    }

    // Import achievements
    if (importData.data.achievements) {
      console.log(`🏆 Importing ${importData.data.achievements.length} achievements...`);
      
      for (const achievement of importData.data.achievements) {
        try {
          await db.runAsync(`
            INSERT OR IGNORE INTO user_achievements 
            (id, achievement_id, unlocked_at, progress_value, notification_shown)
            VALUES (?, ?, ?, ?, ?)
          `, [
            achievement.id,
            achievement.achievement_id,
            achievement.unlocked_at,
            achievement.progress_value,
            achievement.notification_shown,
          ]);
          stats.achievementsImported++;
        } catch (error) {
          console.warn('Skipping achievement:', error.message);
        }
      }
    }

    // Import settings
    if (importData.data.settings) {
      console.log('⚙️  Importing settings...');
      
      for (const [key, value] of Object.entries(importData.data.settings)) {
        if (value !== null) {
          await AsyncStorage.setItem(key, value);
        }
      }
    }

    console.log('✅ Import complete:', stats);
    return stats;
  } catch (error) {
    console.error('Error importing progress:', error);
    throw error;
  }
};

/**
 * Helper: Insert progress entry
 */
async function insertProgressEntry(entry) {
  await db.runAsync(`
    INSERT INTO user_word_progress 
    (id, word_id, status, confidence_level, consecutive_correct,
     ease_factor, interval_days, next_review_date,
     times_shown, times_correct, times_incorrect, last_reviewed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    entry.id,
    entry.word_id,
    entry.status,
    entry.confidence_level,
    entry.consecutive_correct,
    entry.ease_factor,
    entry.interval_days,
    entry.next_review_date,
    entry.times_shown,
    entry.times_correct,
    entry.times_incorrect,
    entry.last_reviewed_at,
  ]);
}

/**
 * Import from file picker
 */
export const importFromFile = async (mode = 'merge') => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      console.log('Import cancelled');
      return null;
    }

    const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
    const importData = JSON.parse(fileContent);

    const stats = await importProgress(importData, mode);
    return stats;
  } catch (error) {
    console.error('Error importing from file:', error);
    throw error;
  }
};

/**
 * Get import preview without actually importing
 */
export const previewImport = async (importData) => {
  try {
    const preview = {
      version: importData.version,
      exportDate: importData.exportDate,
      stats: importData.stats,
      compatible: importData.version === '1.0',
      warnings: [],
    };

    // Check for potential conflicts
    const currentProgress = await db.getFirstAsync(
      'SELECT COUNT(*) as count FROM user_word_progress'
    );

    if (currentProgress.count > 0) {
      preview.warnings.push(
        `You have ${currentProgress.count} words in progress. Choose 'Merge' to combine or 'Replace' to overwrite.`
      );
    }

    return preview;
  } catch (error) {
    console.error('Error previewing import:', error);
    throw error;
  }
};

export default {
  exportProgress,
  exportToFile,
  shareBackup,
  importProgress,
  importFromFile,
  previewImport,
};
