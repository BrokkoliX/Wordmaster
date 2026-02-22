/**
 * Streak Service
 * Handles daily streak tracking and calculations
 */

/**
 * Calculate current streak based on last activity date
 * @param {string} lastActivityDate - ISO date string of last activity
 * @returns {number} - Current streak in days
 */
export function calculateStreak(lastActivityDate) {
  if (!lastActivityDate) {
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActivity = new Date(lastActivityDate);
  lastActivity.setHours(0, 0, 0, 0);

  const diffTime = today - lastActivity;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Same day or yesterday = streak continues
  if (diffDays === 0 || diffDays === 1) {
    return diffDays;
  }

  // More than 1 day gap = streak broken
  return -1; // Indicates streak should reset
}

/**
 * Get streak level/milestone
 * @param {number} days - Current streak days
 * @returns {object} - Level info {level, name, emoji, color}
 */
export function getStreakLevel(days) {
  if (days >= 365) {
    return {
      level: 5,
      name: 'Legendary',
      emoji: '🔥🔥🔥🔥',
      color: '#FFD700', // Gold
      description: 'You are unstoppable!'
    };
  } else if (days >= 100) {
    return {
      level: 4,
      name: 'Gold',
      emoji: '🔥🔥🔥',
      color: '#FFA500', // Orange
      description: 'Keep the fire burning!'
    };
  } else if (days >= 30) {
    return {
      level: 3,
      name: 'Silver',
      emoji: '🔥🔥',
      color: '#C0C0C0', // Silver
      description: 'You\'re on fire!'
    };
  } else if (days >= 7) {
    return {
      level: 2,
      name: 'Bronze',
      emoji: '🔥',
      color: '#CD7F32', // Bronze
      description: 'One week strong!'
    };
  } else if (days >= 1) {
    return {
      level: 1,
      name: 'Started',
      emoji: '🔥',
      color: '#FF4500', // Red-Orange
      description: 'Great start!'
    };
  } else {
    return {
      level: 0,
      name: 'None',
      emoji: '💤',
      color: '#808080', // Gray
      description: 'Start your streak today!'
    };
  }
}

/**
 * Get simple streak emoji based on days
 * @param {number} days - Current streak days
 * @returns {string} - Flame emoji(s)
 */
export function getStreakEmoji(days) {
  const level = getStreakLevel(days);
  return level.emoji;
}

/**
 * Get motivational message for streak
 * @param {number} currentStreak - Current streak days
 * @param {number} longestStreak - Longest streak achieved
 * @returns {string} - Motivational message
 */
export function getStreakMessage(currentStreak, longestStreak) {
  if (currentStreak === 0) {
    return "Start your learning streak today!";
  } else if (currentStreak === 1) {
    return "Great start! Come back tomorrow to continue your streak.";
  } else if (currentStreak < 7) {
    return `${currentStreak} days in a row! Keep it going!`;
  } else if (currentStreak === 7) {
    return "🎉 One week streak! You're building a solid habit!";
  } else if (currentStreak < 30) {
    return `${currentStreak} day streak! You're on fire! 🔥`;
  } else if (currentStreak === 30) {
    return "🎉 30 days! You're a WordMaster champion!";
  } else if (currentStreak < 100) {
    return `${currentStreak} days! Nothing can stop you now!`;
  } else if (currentStreak === 100) {
    return "🏆 100 DAYS! You are absolutely legendary!";
  } else if (currentStreak === 365) {
    return "👑 ONE YEAR STREAK! You are a TRUE MASTER!";
  } else if (currentStreak === longestStreak && currentStreak > 7) {
    return `${currentStreak} days - Personal record! 🏅`;
  } else {
    return `${currentStreak} day streak! Keep up the amazing work!`;
  }
}

/**
 * Check if user completed learning today
 * @param {string} lastActivityDate - ISO date string
 * @returns {boolean} - True if activity was today
 */
export function completedToday(lastActivityDate) {
  if (!lastActivityDate) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActivity = new Date(lastActivityDate);
  lastActivity.setHours(0, 0, 0, 0);

  return today.getTime() === lastActivity.getTime();
}

/**
 * Get days until streak is lost
 * @param {string} lastActivityDate - ISO date string
 * @returns {number} - Hours until streak breaks (if within 48h)
 */
export function getStreakTimeRemaining(lastActivityDate) {
  if (!lastActivityDate) {
    return 0;
  }

  const now = new Date();
  const lastActivity = new Date(lastActivityDate);
  
  // Calculate hours since last activity
  const hoursSince = (now - lastActivity) / (1000 * 60 * 60);
  
  // Streak breaks after 48 hours (2 days)
  const hoursRemaining = 48 - hoursSince;
  
  return hoursRemaining > 0 ? Math.floor(hoursRemaining) : 0;
}

/**
 * Format streak display text
 * @param {number} days - Streak days
 * @returns {string} - Formatted text like "15 Days"
 */
export function formatStreakDisplay(days) {
  if (days === 0) {
    return "No Streak";
  } else if (days === 1) {
    return "1 Day";
  } else {
    return `${days} Days`;
  }
}

/**
 * Check if streak milestone was just reached
 * @param {number} oldStreak - Previous streak
 * @param {number} newStreak - New streak
 * @returns {object|null} - Milestone info if reached, null otherwise
 */
export function checkMilestoneReached(oldStreak, newStreak) {
  const milestones = [7, 30, 100, 365];
  
  for (const milestone of milestones) {
    if (oldStreak < milestone && newStreak >= milestone) {
      const level = getStreakLevel(milestone);
      return {
        days: milestone,
        level: level.name,
        emoji: level.emoji,
        message: `${level.emoji} ${milestone} Day Streak! ${level.description}`
      };
    }
  }
  
  return null;
}

export default {
  calculateStreak,
  getStreakLevel,
  getStreakEmoji,
  getStreakMessage,
  completedToday,
  getStreakTimeRemaining,
  formatStreakDisplay,
  checkMilestoneReached
};
