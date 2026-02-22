/**
 * Follow Service
 *
 * Client-side wrapper for the /api/follow endpoints.
 * All methods return { data, error } so callers can handle failures uniformly.
 */

import api from './api';

class FollowService {
  /**
   * Search for users by username or name.
   */
  async searchUsers(queryText) {
    try {
      const { data } = await api.get('/follow/search', {
        params: { q: queryText },
      });
      return { data: data.users, error: null };
    } catch (error) {
      return { data: null, error: this._extractMessage(error) };
    }
  }

  /**
   * Send a follow request to another user.
   */
  async followUser(userId) {
    try {
      const { data } = await api.post(`/follow/${userId}`);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: this._extractMessage(error) };
    }
  }

  /**
   * Unfollow a user or cancel a pending request.
   */
  async unfollowUser(userId) {
    try {
      const { data } = await api.delete(`/follow/${userId}`);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: this._extractMessage(error) };
    }
  }

  /**
   * Accept a pending follow request from another user.
   */
  async acceptRequest(userId) {
    try {
      const { data } = await api.post(`/follow/${userId}/accept`);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: this._extractMessage(error) };
    }
  }

  /**
   * Reject a pending follow request.
   */
  async rejectRequest(userId) {
    try {
      const { data } = await api.post(`/follow/${userId}/reject`);
      return { data, error: null };
    } catch (error) {
      return { data: null, error: this._extractMessage(error) };
    }
  }

  /**
   * Get the current user's accepted followers.
   */
  async getFollowers() {
    try {
      const { data } = await api.get('/follow/followers');
      return { data: data.followers, error: null };
    } catch (error) {
      return { data: null, error: this._extractMessage(error) };
    }
  }

  /**
   * Get the list of users the current user follows.
   */
  async getFollowing() {
    try {
      const { data } = await api.get('/follow/following');
      return { data: data.following, error: null };
    } catch (error) {
      return { data: null, error: this._extractMessage(error) };
    }
  }

  /**
   * Get pending incoming follow requests.
   */
  async getPendingRequests() {
    try {
      const { data } = await api.get('/follow/requests/pending');
      return { data: data.requests, error: null };
    } catch (error) {
      return { data: null, error: this._extractMessage(error) };
    }
  }

  /**
   * Get outgoing follow requests still pending.
   */
  async getSentRequests() {
    try {
      const { data } = await api.get('/follow/requests/sent');
      return { data: data.requests, error: null };
    } catch (error) {
      return { data: null, error: this._extractMessage(error) };
    }
  }

  /**
   * Get follower / following / pending counts.
   */
  async getCounts() {
    try {
      const { data } = await api.get('/follow/counts');
      return { data: data.counts, error: null };
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

export default new FollowService();
