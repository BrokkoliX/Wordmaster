/**
 * Authentication Service
 * 
 * Handles user authentication using Supabase
 * - Login/Signup
 * - Session management
 * - User profile
 * - Password reset
 * 
 * For now, uses AsyncStorage for local auth (will migrate to Supabase)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
// import { createClient } from '@supabase/supabase-js';

// Supabase configuration (will be populated after setup)
// const SUPABASE_URL = process.env.SUPABASE_URL || '';
// const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
// const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AUTH_KEY = 'wordmaster_auth';
const USER_KEY = 'wordmaster_user';

/**
 * Local Authentication (temporary until Supabase is set up)
 */

class AuthService {
  constructor() {
    this.currentUser = null;
  }

  /**
   * Initialize - load saved session
   */
  async initialize() {
    try {
      const savedUser = await AsyncStorage.getItem(USER_KEY);
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser);
        return this.currentUser;
      }
      return null;
    } catch (error) {
      console.error('Error initializing auth:', error);
      return null;
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(email, password, username) {
    try {
      // Validate input
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // For now, create local user (will use Supabase later)
      const userId = `user_${Date.now()}`;
      const user = {
        id: userId,
        email: email.toLowerCase(),
        username: username || email.split('@')[0],
        displayName: username || email.split('@')[0],
        avatarUrl: null,
        createdAt: new Date().toISOString(),
        
        // Subscription
        subscriptionTier: 'free',
        subscriptionExpiresAt: null,
        
        // Learning preferences
        nativeLanguage: 'en',
        learningLanguages: [],
        currentCefrLevel: 'A1',
        
        // Statistics (will sync with local DB)
        totalWordsLearned: 0,
        totalSessions: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalAchievements: 0
      };

      // Save user
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({
        userId: user.id,
        email: user.email,
        password: password, // In production, this would be hashed server-side
        loggedInAt: new Date().toISOString()
      }));

      this.currentUser = user;
      
      console.log('✅ User signed up:', user.email);
      return { user, error: null };
    } catch (error) {
      console.error('Signup error:', error);
      return { user: null, error: error.message };
    }
  }

  /**
   * Login with email and password
   */
  async login(email, password) {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // For now, check local storage (will use Supabase later)
      const savedAuth = await AsyncStorage.getItem(AUTH_KEY);
      const savedUser = await AsyncStorage.getItem(USER_KEY);

      if (!savedAuth || !savedUser) {
        throw new Error('No account found. Please sign up first.');
      }

      const auth = JSON.parse(savedAuth);
      const user = JSON.parse(savedUser);

      // Verify credentials
      if (auth.email.toLowerCase() !== email.toLowerCase() || auth.password !== password) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      auth.loggedInAt = new Date().toISOString();
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(auth));

      this.currentUser = user;

      console.log('✅ User logged in:', user.email);
      return { user, error: null };
    } catch (error) {
      console.error('Login error:', error);
      return { user: null, error: error.message };
    }
  }

  /**
   * Logout
   */
  async logout() {
    try {
      // Clear current user
      this.currentUser = null;
      
      // Note: We keep the user data but just logout
      // This allows quick re-login without losing data
      
      console.log('✅ User logged out');
      return { error: null };
    } catch (error) {
      console.error('Logout error:', error);
      return { error: error.message };
    }
  }

  /**
   * Get current user
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if user is logged in
   */
  async isLoggedIn() {
    if (this.currentUser) {
      return true;
    }

    // Try to load from storage
    const user = await this.initialize();
    return user !== null;
  }

  /**
   * Update user profile
   */
  async updateProfile(updates) {
    try {
      if (!this.currentUser) {
        throw new Error('No user logged in');
      }

      // Merge updates
      this.currentUser = {
        ...this.currentUser,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Save to storage
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(this.currentUser));

      console.log('✅ Profile updated');
      return { user: this.currentUser, error: null };
    } catch (error) {
      console.error('Update profile error:', error);
      return { user: null, error: error.message };
    }
  }

  /**
   * Update user statistics (sync from local DB)
   */
  async updateStats(stats) {
    try {
      if (!this.currentUser) {
        return { error: 'No user logged in' };
      }

      this.currentUser = {
        ...this.currentUser,
        totalWordsLearned: stats.wordsLearned || 0,
        totalSessions: stats.sessionsCompleted || 0,
        currentStreak: stats.currentStreak || 0,
        longestStreak: stats.longestStreak || 0,
        totalAchievements: stats.achievements || 0,
        statsUpdatedAt: new Date().toISOString()
      };

      await AsyncStorage.setItem(USER_KEY, JSON.stringify(this.currentUser));

      return { error: null };
    } catch (error) {
      console.error('Update stats error:', error);
      return { error: error.message };
    }
  }

  /**
   * Reset password (will implement with Supabase)
   */
  async resetPassword(email) {
    try {
      // TODO: Implement with Supabase password reset
      console.log('Password reset requested for:', email);
      return { 
        error: null, 
        message: 'Password reset email sent (feature coming soon)' 
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Guest mode - use app without account
   */
  async continueAsGuest() {
    try {
      const guestUser = {
        id: `guest_${Date.now()}`,
        email: null,
        username: 'Guest',
        displayName: 'Guest User',
        isGuest: true,
        createdAt: new Date().toISOString(),
        
        // Guest has limited features
        subscriptionTier: 'guest',
        
        // Learning preferences
        nativeLanguage: 'en',
        learningLanguages: [],
        currentCefrLevel: 'A1',
        
        // Statistics
        totalWordsLearned: 0,
        totalSessions: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalAchievements: 0
      };

      await AsyncStorage.setItem(USER_KEY, JSON.stringify(guestUser));
      this.currentUser = guestUser;

      console.log('✅ Continuing as guest');
      return { user: guestUser, error: null };
    } catch (error) {
      console.error('Guest mode error:', error);
      return { user: null, error: error.message };
    }
  }

  /**
   * Convert guest to registered user
   */
  async upgradeGuestAccount(email, password, username) {
    try {
      if (!this.currentUser || !this.currentUser.isGuest) {
        throw new Error('No guest account to upgrade');
      }

      // Keep existing stats but add auth
      const upgradedUser = {
        ...this.currentUser,
        id: `user_${Date.now()}`,
        email: email.toLowerCase(),
        username: username || email.split('@')[0],
        displayName: username || email.split('@')[0],
        isGuest: false,
        subscriptionTier: 'free',
        upgradedAt: new Date().toISOString()
      };

      // Save credentials
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({
        userId: upgradedUser.id,
        email: upgradedUser.email,
        password: password,
        loggedInAt: new Date().toISOString()
      }));

      await AsyncStorage.setItem(USER_KEY, JSON.stringify(upgradedUser));
      this.currentUser = upgradedUser;

      console.log('✅ Guest account upgraded to registered user');
      return { user: upgradedUser, error: null };
    } catch (error) {
      console.error('Upgrade account error:', error);
      return { user: null, error: error.message };
    }
  }

  /**
   * Delete account
   */
  async deleteAccount() {
    try {
      await AsyncStorage.removeItem(AUTH_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      this.currentUser = null;

      console.log('✅ Account deleted');
      return { error: null };
    } catch (error) {
      console.error('Delete account error:', error);
      return { error: error.message };
    }
  }
}

// Export singleton instance
export default new AuthService();
