const ProgressModel = require('../models/progress.model');

/**
 * Sync user progress
 */
exports.syncProgress = async (req, res) => {
  try {
    const { progress, sessions, achievements, settings } = req.body;

    const results = {};

    // Sync word progress
    if (progress && Array.isArray(progress)) {
      results.progressSynced = await ProgressModel.syncWordProgress(
        req.user.id,
        progress
      );
    }

    // Sync sessions
    if (sessions && Array.isArray(sessions)) {
      results.sessionsSynced = [];
      for (const session of sessions) {
        const created = await ProgressModel.createSession(req.user.id, session);
        results.sessionsSynced.push(created);
      }
    }

    // Sync achievements
    if (achievements && Array.isArray(achievements)) {
      results.achievementsSynced = [];
      for (const achievement of achievements) {
        const unlocked = await ProgressModel.unlockAchievement(
          req.user.id,
          achievement.achievementId,
          achievement.progress
        );
        results.achievementsSynced.push(unlocked);
      }
    }

    // Sync settings
    if (settings) {
      results.settings = await ProgressModel.updateSettings(req.user.id, settings);
    }

    res.json({
      message: 'Progress synced successfully',
      synced: {
        progress: results.progressSynced?.length || 0,
        sessions: results.sessionsSynced?.length || 0,
        achievements: results.achievementsSynced?.length || 0,
        settingsUpdated: !!results.settings,
      },
    });
  } catch (error) {
    console.error('Sync progress error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to sync progress',
        code: 'SYNC_FAILED',
      },
    });
  }
};

/**
 * Get user statistics
 */
exports.getStats = async (req, res) => {
  try {
    const stats = await ProgressModel.getStats(req.user.id);

    res.json({
      stats,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get statistics',
        code: 'GET_STATS_FAILED',
      },
    });
  }
};

/**
 * Export all user progress
 */
exports.exportProgress = async (req, res) => {
  try {
    const data = await ProgressModel.getAllProgress(req.user.id);
    const settings = await ProgressModel.getSettings(req.user.id);

    res.json({
      data: {
        ...data,
        settings,
      },
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Export progress error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to export progress',
        code: 'EXPORT_FAILED',
      },
    });
  }
};

/**
 * Get user settings
 */
exports.getSettings = async (req, res) => {
  try {
    const settings = await ProgressModel.getSettings(req.user.id);

    if (!settings) {
      // Return default settings if none exist
      return res.json({
        settings: {
          cefrLevel: 'A1',
          knownLanguage: 'en',
          learningLanguage: 'es',
          ttsEnabled: true,
          ttsRate: 0.75,
          dailyGoal: 20,
          notificationsEnabled: true,
          theme: 'light',
        },
      });
    }

    res.json({
      settings: {
        cefrLevel: settings.cefr_level,
        knownLanguage: settings.known_language,
        learningLanguage: settings.learning_language,
        ttsEnabled: settings.tts_enabled,
        ttsRate: parseFloat(settings.tts_rate),
        dailyGoal: settings.daily_goal,
        notificationsEnabled: settings.notifications_enabled,
        theme: settings.theme,
      },
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get settings',
        code: 'GET_SETTINGS_FAILED',
      },
    });
  }
};

/**
 * Update user settings
 */
exports.updateSettings = async (req, res) => {
  try {
    const settings = await ProgressModel.updateSettings(req.user.id, req.body);

    res.json({
      message: 'Settings updated successfully',
      settings: {
        cefrLevel: settings.cefr_level,
        knownLanguage: settings.known_language,
        learningLanguage: settings.learning_language,
        ttsEnabled: settings.tts_enabled,
        ttsRate: parseFloat(settings.tts_rate),
        dailyGoal: settings.daily_goal,
        notificationsEnabled: settings.notifications_enabled,
        theme: settings.theme,
      },
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to update settings',
        code: 'UPDATE_SETTINGS_FAILED',
      },
    });
  }
};
