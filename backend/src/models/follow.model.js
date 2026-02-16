const { query } = require('../config/database');

/**
 * Relationship statuses:
 *   'pending'  – an invitation has been sent but not yet accepted
 *   'accepted' – both sides have confirmed the follow
 */
const STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
};

class FollowModel {
  /**
   * Send a follow request (or invitation) from one user to another.
   * Returns the newly created row or throws if a relationship already exists.
   */
  static async createFollowRequest(followerId, followingId) {
    const result = await query(
      `INSERT INTO user_follows (follower_id, following_id, status)
       VALUES ($1, $2, $3)
       ON CONFLICT (follower_id, following_id) DO NOTHING
       RETURNING *`,
      [followerId, followingId, STATUS.PENDING]
    );

    return result.rows[0] || null;
  }

  /**
   * Accept a pending follow request.
   */
  static async acceptRequest(followerId, followingId) {
    const result = await query(
      `UPDATE user_follows
       SET status = $1, accepted_at = NOW()
       WHERE follower_id = $2 AND following_id = $3 AND status = $4
       RETURNING *`,
      [STATUS.ACCEPTED, followerId, followingId, STATUS.PENDING]
    );

    return result.rows[0] || null;
  }

  /**
   * Reject (delete) a pending follow request.
   */
  static async rejectRequest(followerId, followingId) {
    const result = await query(
      `DELETE FROM user_follows
       WHERE follower_id = $1 AND following_id = $2 AND status = $3
       RETURNING *`,
      [followerId, followingId, STATUS.PENDING]
    );

    return result.rows[0] || null;
  }

  /**
   * Remove an existing follow relationship (unfollow).
   */
  static async unfollow(followerId, followingId) {
    const result = await query(
      `DELETE FROM user_follows
       WHERE follower_id = $1 AND following_id = $2
       RETURNING *`,
      [followerId, followingId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get all users that a given user is following (accepted only).
   */
  static async getFollowing(userId) {
    const result = await query(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.avatar_url,
              uf.created_at AS followed_at
       FROM user_follows uf
       JOIN users u ON u.id = uf.following_id
       WHERE uf.follower_id = $1 AND uf.status = $2
       ORDER BY uf.created_at DESC`,
      [userId, STATUS.ACCEPTED]
    );

    return result.rows;
  }

  /**
   * Get all users that follow a given user (accepted only).
   */
  static async getFollowers(userId) {
    const result = await query(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.avatar_url,
              uf.created_at AS followed_at
       FROM user_follows uf
       JOIN users u ON u.id = uf.follower_id
       WHERE uf.following_id = $1 AND uf.status = $2
       ORDER BY uf.created_at DESC`,
      [userId, STATUS.ACCEPTED]
    );

    return result.rows;
  }

  /**
   * Get pending follow requests received by a user (invitations to accept).
   */
  static async getPendingRequests(userId) {
    const result = await query(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.avatar_url,
              uf.created_at AS requested_at
       FROM user_follows uf
       JOIN users u ON u.id = uf.follower_id
       WHERE uf.following_id = $1 AND uf.status = $2
       ORDER BY uf.created_at DESC`,
      [userId, STATUS.PENDING]
    );

    return result.rows;
  }

  /**
   * Get outgoing follow requests that are still pending.
   */
  static async getSentRequests(userId) {
    const result = await query(
      `SELECT u.id, u.username, u.first_name, u.last_name, u.avatar_url,
              uf.created_at AS requested_at
       FROM user_follows uf
       JOIN users u ON u.id = uf.following_id
       WHERE uf.follower_id = $1 AND uf.status = $2
       ORDER BY uf.created_at DESC`,
      [userId, STATUS.PENDING]
    );

    return result.rows;
  }

  /**
   * Check the relationship status between two users.
   * Returns the row if one exists, otherwise null.
   */
  static async getRelationship(followerId, followingId) {
    const result = await query(
      `SELECT * FROM user_follows
       WHERE follower_id = $1 AND following_id = $2`,
      [followerId, followingId]
    );

    return result.rows[0] || null;
  }

  /**
   * Counts (followers, following) for a user – accepted only.
   */
  static async getCounts(userId) {
    const result = await query(
      `SELECT
         (SELECT COUNT(*) FROM user_follows WHERE following_id = $1 AND status = $2) AS followers_count,
         (SELECT COUNT(*) FROM user_follows WHERE follower_id = $1 AND status = $2) AS following_count,
         (SELECT COUNT(*) FROM user_follows WHERE following_id = $1 AND status = $3) AS pending_count`,
      [userId, STATUS.ACCEPTED, STATUS.PENDING]
    );

    return result.rows[0];
  }

  /**
   * Search users by username prefix (for the "find people" feature).
   * Excludes the requesting user.
   */
  static async searchUsers(currentUserId, searchTerm, limit = 20) {
    const result = await query(
      `SELECT id, username, first_name, last_name, avatar_url
       FROM users
       WHERE id != $1
         AND (username ILIKE $2 OR first_name ILIKE $2 OR last_name ILIKE $2)
       ORDER BY username ASC
       LIMIT $3`,
      [currentUserId, `%${searchTerm}%`, limit]
    );

    return result.rows;
  }
}

module.exports = FollowModel;
