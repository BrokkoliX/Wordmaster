/**
 * User-friendly error messages
 * Replaces generic technical errors with helpful, actionable messages
 */

export const ErrorMessages = {
  // Database Errors
  DATABASE_INIT_FAILED: {
    title: 'Setup Error',
    message: "We couldn't set up the app properly. Please restart WordMaster.",
    action: 'Restart App'
  },
  DATABASE_QUERY_FAILED: {
    title: 'Loading Error',
    message: "We couldn't load your data. Please try again.",
    action: 'Try Again'
  },
  DATABASE_WRITE_FAILED: {
    title: 'Save Error',
    message: "We couldn't save your progress. Don't worry, we'll try again.",
    action: 'Continue'
  },

  // Network Errors (for future cloud features)
  NETWORK_ERROR: {
    title: 'Connection Error',
    message: "Can't connect to the internet. WordMaster works offline, so you can keep learning!",
    action: 'Continue Offline'
  },
  NETWORK_TIMEOUT: {
    title: 'Connection Timeout',
    message: "The connection is taking too long. Please try again.",
    action: 'Retry'
  },

  // Loading Errors
  WORDS_LOAD_FAILED: {
    title: 'Words Not Loading',
    message: "We couldn't load the vocabulary. Please restart the app.",
    action: 'Restart'
  },
  CATEGORIES_LOAD_FAILED: {
    title: 'Categories Not Loading',
    message: "We couldn't load the word categories. Please try again.",
    action: 'Try Again'
  },
  ACHIEVEMENTS_LOAD_FAILED: {
    title: 'Achievements Not Loading',
    message: "We couldn't load your achievements. Your progress is safe!",
    action: 'Try Again'
  },

  // Progress Errors
  PROGRESS_UPDATE_FAILED: {
    title: 'Progress Not Saved',
    message: "We couldn't save your progress for this word. We'll keep trying in the background.",
    action: 'Continue'
  },
  STATS_LOAD_FAILED: {
    title: 'Stats Not Loading',
    message: "We couldn't load your statistics. Your progress is safe!",
    action: 'Try Again'
  },

  // Settings Errors
  SETTINGS_SAVE_FAILED: {
    title: 'Settings Not Saved',
    message: "We couldn't save your settings. Please try again.",
    action: 'Try Again'
  },
  SETTINGS_LOAD_FAILED: {
    title: 'Settings Not Loading',
    message: "We couldn't load your settings. Using defaults.",
    action: 'OK'
  },

  // Session Errors
  SESSION_START_FAILED: {
    title: 'Session Error',
    message: "We couldn't start your learning session. Please try again.",
    action: 'Try Again'
  },
  SESSION_END_FAILED: {
    title: 'Session Error',
    message: "We had trouble ending your session, but your progress was saved!",
    action: 'OK'
  },

  // TTS Errors
  TTS_NOT_AVAILABLE: {
    title: 'Audio Not Available',
    message: "We can't play audio on this device. You can still learn without sound!",
    action: 'Continue Without Audio'
  },
  TTS_PLAYBACK_FAILED: {
    title: 'Audio Error',
    message: "We couldn't play the pronunciation. Try tapping the speaker icon again.",
    action: 'OK'
  },

  // Generic Errors
  UNKNOWN_ERROR: {
    title: 'Oops!',
    message: "Something unexpected happened. Please try again.",
    action: 'Try Again'
  },
  FEATURE_NOT_AVAILABLE: {
    title: 'Coming Soon',
    message: "This feature isn't available yet. Stay tuned for updates!",
    action: 'OK'
  },
  INSUFFICIENT_DATA: {
    title: 'Not Enough Words',
    message: "We need more words for this level. Try a different CEFR level.",
    action: 'Change Level'
  }
};

/**
 * Get a user-friendly error message
 * @param {string} errorKey - Key from ErrorMessages
 * @param {Error} originalError - Original error object (optional, for logging)
 * @returns {object} - Error message object with title, message, and action
 */
export function getUserFriendlyError(errorKey, originalError = null) {
  // Log technical error for debugging
  if (originalError && __DEV__) {
    console.error(`[${errorKey}] Technical error:`, originalError);
  }

  // Return user-friendly message
  return ErrorMessages[errorKey] || ErrorMessages.UNKNOWN_ERROR;
}

/**
 * Parse error and return appropriate user-friendly message
 * @param {Error} error - Error object
 * @returns {object} - Error message object
 */
export function parseError(error) {
  if (!error) {
    return ErrorMessages.UNKNOWN_ERROR;
  }

  const errorMessage = error.message?.toLowerCase() || '';

  // Database errors
  if (errorMessage.includes('database') || errorMessage.includes('sqlite')) {
    if (errorMessage.includes('init')) {
      return getUserFriendlyError('DATABASE_INIT_FAILED', error);
    }
    if (errorMessage.includes('write') || errorMessage.includes('insert') || errorMessage.includes('update')) {
      return getUserFriendlyError('DATABASE_WRITE_FAILED', error);
    }
    return getUserFriendlyError('DATABASE_QUERY_FAILED', error);
  }

  // Network errors
  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    if (errorMessage.includes('timeout')) {
      return getUserFriendlyError('NETWORK_TIMEOUT', error);
    }
    return getUserFriendlyError('NETWORK_ERROR', error);
  }

  // Loading errors
  if (errorMessage.includes('load')) {
    if (errorMessage.includes('word')) {
      return getUserFriendlyError('WORDS_LOAD_FAILED', error);
    }
    if (errorMessage.includes('achievement')) {
      return getUserFriendlyError('ACHIEVEMENTS_LOAD_FAILED', error);
    }
    if (errorMessage.includes('category')) {
      return getUserFriendlyError('CATEGORIES_LOAD_FAILED', error);
    }
    if (errorMessage.includes('stat')) {
      return getUserFriendlyError('STATS_LOAD_FAILED', error);
    }
  }

  // Progress errors
  if (errorMessage.includes('progress')) {
    return getUserFriendlyError('PROGRESS_UPDATE_FAILED', error);
  }

  // Settings errors
  if (errorMessage.includes('setting')) {
    if (errorMessage.includes('save')) {
      return getUserFriendlyError('SETTINGS_SAVE_FAILED', error);
    }
    return getUserFriendlyError('SETTINGS_LOAD_FAILED', error);
  }

  // TTS errors
  if (errorMessage.includes('speech') || errorMessage.includes('tts') || errorMessage.includes('audio')) {
    return getUserFriendlyError('TTS_PLAYBACK_FAILED', error);
  }

  // Default to unknown error
  return getUserFriendlyError('UNKNOWN_ERROR', error);
}

/**
 * Show a user-friendly error alert
 * @param {Error} error - Error object
 * @param {function} onAction - Callback for action button
 */
export function showErrorAlert(error, onAction = null) {
  const { title, message, action } = parseError(error);
  
  const Alert = require('react-native').Alert;
  
  Alert.alert(
    title,
    message,
    [
      {
        text: action,
        onPress: onAction || (() => {}),
        style: 'default'
      }
    ]
  );
}

export default {
  ErrorMessages,
  getUserFriendlyError,
  parseError,
  showErrorAlert
};
