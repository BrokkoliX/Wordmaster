/**
 * Authentication Service
 *
 * Handles user authentication against the Express/PostgreSQL backend.
 * Tokens and the user object are persisted in AsyncStorage so the app
 * can restore the session after a cold start.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'wordmaster_user';

class AuthService {
  constructor() {
    this.currentUser = null;
  }

  // ──────────────────────────── helpers ────────────────────────────

  async _saveTokens(accessToken, refreshToken) {
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  async _saveUser(user) {
    this.currentUser = user;
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  async _clearSession() {
    this.currentUser = null;
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
  }

  // ──────────────────────────── public API ─────────────────────────

  /**
   * Restore the session from AsyncStorage on cold start.
   * Returns the cached user or null.
   */
  async initialize() {
    try {
      const savedUser = await AsyncStorage.getItem(USER_KEY);
      if (savedUser) {
        this.currentUser = JSON.parse(savedUser);

        // If the user is a guest there is no backend session to validate.
        if (this.currentUser.isGuest) {
          return this.currentUser;
        }

        // Validate the session by fetching the profile from the backend.
        // If the access token expired the axios interceptor will attempt
        // a refresh automatically.
        try {
          const { data } = await api.get('/users/me');
          const user = this._mapBackendUser(data.user);
          await this._saveUser(user);
          return user;
        } catch {
          // Token invalid/expired and refresh also failed.
          // Keep local cache so the login screen can pre-fill the email.
          return null;
        }
      }
      return null;
    } catch (error) {
      console.error('Auth init error:', error);
      return null;
    }
  }

  /**
   * Register a new account on the backend.
   */
  async signUp(email, password, username) {
    try {
      const { data } = await api.post('/auth/register', {
        email,
        password,
        username,
      });

      await this._saveTokens(data.accessToken, data.refreshToken);

      const user = this._mapBackendUser(data.user);
      await this._saveUser(user);

      return { user, error: null };
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        'Registration failed';
      return { user: null, error: message };
    }
  }

  /**
   * Log in with email and password.
   */
  async login(email, password) {
    try {
      const { data } = await api.post('/auth/login', { email, password });

      await this._saveTokens(data.accessToken, data.refreshToken);

      const user = this._mapBackendUser(data.user);
      await this._saveUser(user);

      return { user, error: null };
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        'Login failed';
      return { user: null, error: message };
    }
  }

  /**
   * Log out locally and notify the backend.
   */
  async logout() {
    try {
      // Best-effort server-side logout (invalidate refresh token, etc.)
      try {
        await api.post('/auth/logout');
      } catch {
        // Ignore network errors during logout
      }

      await this._clearSession();
      return { error: null };
    } catch (error) {
      console.error('Logout error:', error);
      return { error: error.message };
    }
  }

  /**
   * Continue without an account.  No backend call; the guest user is
   * persisted locally only.
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
        subscriptionTier: 'guest',
        nativeLanguage: 'en',
        learningLanguages: [],
        currentCefrLevel: 'A1',
        totalWordsLearned: 0,
        totalSessions: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalAchievements: 0,
      };

      await this._saveUser(guestUser);
      return { user: guestUser, error: null };
    } catch (error) {
      console.error('Guest mode error:', error);
      return { user: null, error: error.message };
    }
  }

  /**
   * Upgrade a guest account by registering with the backend.
   * The existing local progress is preserved.
   */
  async upgradeGuestAccount(email, password, username) {
    try {
      if (!this.currentUser?.isGuest) {
        throw new Error('No guest account to upgrade');
      }

      const { data } = await api.post('/auth/register', {
        email,
        password,
        username,
      });

      await this._saveTokens(data.accessToken, data.refreshToken);

      // Merge existing local stats into the new backend-backed user.
      const user = {
        ...this._mapBackendUser(data.user),
        totalWordsLearned: this.currentUser.totalWordsLearned || 0,
        totalSessions: this.currentUser.totalSessions || 0,
        currentStreak: this.currentUser.currentStreak || 0,
        longestStreak: this.currentUser.longestStreak || 0,
        totalAchievements: this.currentUser.totalAchievements || 0,
        upgradedAt: new Date().toISOString(),
      };

      await this._saveUser(user);
      return { user, error: null };
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        'Account upgrade failed';
      return { user: null, error: message };
    }
  }

  /**
   * Get the locally cached user without a network call.
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if a user session exists (local cache).
   */
  async isLoggedIn() {
    if (this.currentUser) return true;
    const user = await this.initialize();
    return user !== null;
  }

  /**
   * Update the user profile on the backend.
   */
  async updateProfile(updates) {
    try {
      if (!this.currentUser) throw new Error('No user logged in');

      if (this.currentUser.isGuest) {
        // Guest updates are local-only.
        const updatedUser = {
          ...this.currentUser,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        await this._saveUser(updatedUser);
        return { user: updatedUser, error: null };
      }

      const { data } = await api.put('/users/me', {
        username: updates.username,
        firstName: updates.firstName,
        lastName: updates.lastName,
        avatarUrl: updates.avatarUrl,
      });

      const user = this._mapBackendUser(data.user);
      await this._saveUser(user);
      return { user, error: null };
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        'Profile update failed';
      return { user: null, error: message };
    }
  }

  /**
   * Sync locally computed statistics up to the backend.
   */
  async updateStats(stats) {
    try {
      if (!this.currentUser) return { error: 'No user logged in' };

      const updatedUser = {
        ...this.currentUser,
        totalWordsLearned: stats.wordsLearned || 0,
        totalSessions: stats.sessionsCompleted || 0,
        currentStreak: stats.currentStreak || 0,
        longestStreak: stats.longestStreak || 0,
        totalAchievements: stats.achievements || 0,
        statsUpdatedAt: new Date().toISOString(),
      };

      await this._saveUser(updatedUser);
      return { error: null };
    } catch (error) {
      console.error('Update stats error:', error);
      return { error: error.message };
    }
  }

  /**
   * Request a password reset email (placeholder -- backend endpoint
   * does not send emails yet).
   */
  async resetPassword(email) {
    try {
      return {
        error: null,
        message: 'Password reset email sent (feature coming soon)',
      };
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Delete the account on the backend and clear local data.
   */
  async deleteAccount(password) {
    try {
      if (this.currentUser?.isGuest) {
        await this._clearSession();
        return { error: null };
      }

      await api.delete('/users/me', { data: { password } });
      await this._clearSession();
      return { error: null };
    } catch (error) {
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        'Account deletion failed';
      return { error: message };
    }
  }

  // ──────────────────────────── mapping ────────────────────────────

  /**
   * Map the backend user payload to the shape the rest of the app
   * expects.
   */
  _mapBackendUser(backendUser) {
    return {
      id: backendUser.id,
      email: backendUser.email,
      username: backendUser.username,
      displayName: backendUser.username || backendUser.email?.split('@')[0],
      firstName: backendUser.firstName || backendUser.first_name || null,
      lastName: backendUser.lastName || backendUser.last_name || null,
      avatarUrl: backendUser.avatarUrl || backendUser.avatar_url || null,
      isGuest: false,
      createdAt: backendUser.createdAt || backendUser.created_at,
      lastLoginAt: backendUser.lastLoginAt || backendUser.last_login_at,
      subscriptionTier: 'free',
      nativeLanguage: 'en',
      learningLanguages: [],
      currentCefrLevel: 'A1',
      totalWordsLearned: 0,
      totalSessions: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalAchievements: 0,
    };
  }
}

export default new AuthService();
