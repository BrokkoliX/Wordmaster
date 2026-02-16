/**
 * Authentication Context
 * 
 * Provides authentication state and methods to the entire app
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Initialize auth on app start
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      setLoading(true);
      const savedUser = await authService.initialize();
      setUser(savedUser);
      setInitialized(true);
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign up
   */
  const signUp = async (email, password, username) => {
    try {
      setLoading(true);
      const { user: newUser, error } = await authService.signUp(email, password, username);
      
      if (error) {
        return { error };
      }

      setUser(newUser);
      return { user: newUser, error: null };
    } catch (error) {
      return { user: null, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Login
   */
  const login = async (email, password) => {
    try {
      setLoading(true);
      const { user: loggedInUser, error } = await authService.login(email, password);
      
      if (error) {
        return { error };
      }

      setUser(loggedInUser);
      return { user: loggedInUser, error: null };
    } catch (error) {
      return { user: null, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout
   */
  const logout = async () => {
    try {
      setLoading(true);
      const { error } = await authService.logout();
      
      if (!error) {
        setUser(null);
      }
      
      return { error };
    } catch (error) {
      return { error: error.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Continue as guest
   */
  const continueAsGuest = async () => {
    try {
      setLoading(true);
      const { user: guestUser, error } = await authService.continueAsGuest();
      
      if (error) {
        return { error };
      }

      setUser(guestUser);
      return { user: guestUser, error: null };
    } catch (error) {
      return { user: null, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update profile
   */
  const updateProfile = async (updates) => {
    try {
      const { user: updatedUser, error } = await authService.updateProfile(updates);
      
      if (!error) {
        setUser(updatedUser);
      }
      
      return { user: updatedUser, error };
    } catch (error) {
      return { user: null, error: error.message };
    }
  };

  /**
   * Update user statistics
   */
  const updateStats = async (stats) => {
    try {
      const { error } = await authService.updateStats(stats);
      
      if (!error && user) {
        // Update local state
        setUser({
          ...user,
          totalWordsLearned: stats.wordsLearned || 0,
          totalSessions: stats.sessionsCompleted || 0,
          currentStreak: stats.currentStreak || 0,
          longestStreak: stats.longestStreak || 0,
          totalAchievements: stats.achievements || 0
        });
      }
      
      return { error };
    } catch (error) {
      return { error: error.message };
    }
  };

  /**
   * Upgrade guest account
   */
  const upgradeGuestAccount = async (email, password, username) => {
    try {
      setLoading(true);
      const { user: upgradedUser, error } = await authService.upgradeGuestAccount(email, password, username);
      
      if (error) {
        return { error };
      }

      setUser(upgradedUser);
      return { user: upgradedUser, error: null };
    } catch (error) {
      return { user: null, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Reset password
   */
  const resetPassword = async (email) => {
    try {
      return await authService.resetPassword(email);
    } catch (error) {
      return { error: error.message };
    }
  };

  /**
   * Delete account
   */
  const deleteAccount = async (password) => {
    try {
      setLoading(true);
      const { error } = await authService.deleteAccount(password);
      
      if (!error) {
        setUser(null);
      }
      
      return { error };
    } catch (error) {
      return { error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    initialized,
    isAuthenticated: user !== null,
    isGuest: user?.isGuest || false,
    isPremium: user?.subscriptionTier === 'premium' || user?.subscriptionTier === 'lifetime',
    signUp,
    login,
    logout,
    continueAsGuest,
    updateProfile,
    updateStats,
    upgradeGuestAccount,
    resetPassword,
    deleteAccount
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default AuthContext;
