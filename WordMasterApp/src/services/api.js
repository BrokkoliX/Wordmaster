import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API Base URL - points to the AWS backend in both dev and production
const API_BASE_URL = 'http://3.91.69.195/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        
        if (!refreshToken) {
          // No refresh token, user needs to login
          throw new Error('No refresh token');
        }

        // Try to refresh the token
        const { data } = await axios.post(
          `${API_BASE_URL.replace('/api', '')}/api/auth/refresh-token`,
          { refreshToken }
        );

        // Save new access token
        await AsyncStorage.setItem('accessToken', data.accessToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        
        // You can emit an event here to notify app to navigate to login
        // For now, just reject
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
