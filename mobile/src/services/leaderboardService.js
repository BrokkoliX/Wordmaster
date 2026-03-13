/**
 * Leaderboard Service
 *
 * Client-side wrapper for the /api/leaderboard endpoints.
 * Follows the same { data, error } pattern as followService.js.
 */

import api from './api';

class LeaderboardService {
  /**
   * Get the global leaderboard.
   */
  async getGlobal(scope = 'all_time', limit = 50, offset = 0) {
    try {
      const { data } = await api.get('/leaderboard/global', {
        params: { scope, limit, offset },
      });
      return { data: data.leaderboard, error: null };
    } catch (error) {
      return { data: null, error: this._extractMessage(error) };
    }
  }

  /**
   * Get the friends-only leaderboard.
   */
  async getFriends(scope = 'all_time') {
    try {
      const { data } = await api.get('/leaderboard/friends', {
        params: { scope },
      });
      return { data: data.leaderboard, error: null };
    } catch (error) {
      return { data: null, error: this._extractMessage(error) };
    }
  }

  /**
   * Get the current user's own rank and XP totals.
   */
  async getMyRank(scope = 'all_time') {
    try {
      const { data } = await api.get('/leaderboard/me', {
        params: { scope },
      });
      return { data, error: null };
    } catch (error) {
      return { data: null, error: this._extractMessage(error) };
    }
  }

  // ────────────────────── helpers ──────────────────────

  _extractMessage(error) {
    return (
      error.response?.data?.error?.message ||
      error.message ||
      'Something went wrong'
    );
  }
}

export default new LeaderboardService();
