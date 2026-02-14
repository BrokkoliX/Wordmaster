/**
 * API Authentication Service
 * 
 * Handles backend API authentication
 * - Register/Login with backend
 * - JWT token management
 * - Sync with local authService
 */

import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ApiAuthService {
  /**
   * Register a new user with backend
   */
  async register({ email, password, username, firstName, lastName }) {
    try {
      const { data } = await api.post('/auth/register', {
        email,
        password,
        username,
        firstName,
        lastName,
      });
      
      // Save tokens and user data
      await this.saveAuthData(data);
      
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: this.handleError(error) };
    }
  }

  /**
   * Login user with backend
   */
  async login(email, password) {
    try {
      const { data } = await api.post('/auth/login', { email, password });
      
      // Save tokens and user data
      await this.saveAuthData(data);
      
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: this.handleError(error) };
    }
  }

  /**
   * Logout user from backend
   */
  async logout() {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
      // Continue with local logout even if API fails
    } finally {
      // Clear local data
      await AsyncStorage.multiRemove([
        'api_accessToken',
        'api_refreshToken',
        'api_user',
      ]);
    }
  }

  /**
   * Get current user from storage
   */
  async getCurrentUser() {
    try {
      const userStr = await AsyncStorage.getItem('api_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Check if user is authenticated with backend
   */
  async isAuthenticated() {
    try {
      const token = await AsyncStorage.getItem('api_accessToken');
      return !!token;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user profile from backend
   */
  async getProfile() {
    try {
      const { data } = await api.get('/users/me');
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: this.handleError(error) };
    }
  }

  /**
   * Update user profile on backend
   */
  async updateProfile(updates) {
    try {
      const { data } = await api.put('/users/me', updates);
      
      // Update local storage
      await AsyncStorage.setItem('api_user', JSON.stringify(data.user));
      
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: this.handleError(error) };
    }
  }

  /**
   * Change password
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const { data } = await api.put('/users/me/password', {
        currentPassword,
        newPassword,
      });
      
      return { error: null, message: data.message };
    } catch (error) {
      return { error: this.handleError(error) };
    }
  }

  /**
   * Delete account
   */
  async deleteAccount(password) {
    try {
      await api.delete('/users/me', { data: { password } });
      
      // Clear local data
      await AsyncStorage.multiRemove([
        'api_accessToken',
        'api_refreshToken',
        'api_user',
      ]);
      
      return { error: null };
    } catch (error) {
      return { error: this.handleError(error) };
    }
  }

  /**
   * Save authentication data
   */
  async saveAuthData(data) {
    await AsyncStorage.setItem('api_accessToken', data.accessToken);
    await AsyncStorage.setItem('api_refreshToken', data.refreshToken);
    await AsyncStorage.setItem('api_user', JSON.stringify(data.user));
  }

  /**
   * Handle API errors
   */
  handleError(error) {
    if (error.response) {
      // Server responded with error
      const errorData = error.response.data?.error;
      return errorData?.message || 'An error occurred';
    } else if (error.request) {
      // Request made but no response
      return 'No response from server. Please check your connection.';
    } else {
      // Something else happened
      return error.message || 'An error occurred';
    }
  }
}

export default new ApiAuthService();
