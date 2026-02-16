const FollowModel = require('../models/follow.model');
const UserModel = require('../models/user.model');

/**
 * Search users by username / name.
 */
exports.searchUsers = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        error: {
          message: 'Search query must be at least 2 characters',
          code: 'INVALID_QUERY',
        },
      });
    }

    const users = await FollowModel.searchUsers(req.user.id, q.trim());

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to search users',
        code: 'SEARCH_FAILED',
      },
    });
  }
};

/**
 * Send a follow request / invitation.
 */
exports.followUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (userId === req.user.id) {
      return res.status(400).json({
        error: {
          message: 'You cannot follow yourself',
          code: 'SELF_FOLLOW',
        },
      });
    }

    const targetUser = await UserModel.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      });
    }

    const existing = await FollowModel.getRelationship(req.user.id, userId);
    if (existing) {
      return res.status(409).json({
        error: {
          message: existing.status === 'pending'
            ? 'Follow request already sent'
            : 'Already following this user',
          code: 'ALREADY_EXISTS',
        },
      });
    }

    const follow = await FollowModel.createFollowRequest(req.user.id, userId);

    res.status(201).json({
      message: 'Follow request sent',
      follow,
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to send follow request',
        code: 'FOLLOW_FAILED',
      },
    });
  }
};

/**
 * Unfollow a user (or cancel a pending request).
 */
exports.unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const removed = await FollowModel.unfollow(req.user.id, userId);

    if (!removed) {
      return res.status(404).json({
        error: {
          message: 'Follow relationship not found',
          code: 'NOT_FOUND',
        },
      });
    }

    res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to unfollow user',
        code: 'UNFOLLOW_FAILED',
      },
    });
  }
};

/**
 * Accept a pending follow request.
 */
exports.acceptRequest = async (req, res) => {
  try {
    const { userId } = req.params;

    const accepted = await FollowModel.acceptRequest(userId, req.user.id);

    if (!accepted) {
      return res.status(404).json({
        error: {
          message: 'Pending follow request not found',
          code: 'NOT_FOUND',
        },
      });
    }

    res.json({ message: 'Follow request accepted', follow: accepted });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to accept request',
        code: 'ACCEPT_FAILED',
      },
    });
  }
};

/**
 * Reject a pending follow request.
 */
exports.rejectRequest = async (req, res) => {
  try {
    const { userId } = req.params;

    const rejected = await FollowModel.rejectRequest(userId, req.user.id);

    if (!rejected) {
      return res.status(404).json({
        error: {
          message: 'Pending follow request not found',
          code: 'NOT_FOUND',
        },
      });
    }

    res.json({ message: 'Follow request rejected' });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to reject request',
        code: 'REJECT_FAILED',
      },
    });
  }
};

/**
 * Get the current user's followers list.
 */
exports.getFollowers = async (req, res) => {
  try {
    const followers = await FollowModel.getFollowers(req.user.id);
    res.json({ followers });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get followers',
        code: 'GET_FOLLOWERS_FAILED',
      },
    });
  }
};

/**
 * Get the list of users the current user is following.
 */
exports.getFollowing = async (req, res) => {
  try {
    const following = await FollowModel.getFollowing(req.user.id);
    res.json({ following });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get following list',
        code: 'GET_FOLLOWING_FAILED',
      },
    });
  }
};

/**
 * Get pending incoming follow requests.
 */
exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await FollowModel.getPendingRequests(req.user.id);
    res.json({ requests });
  } catch (error) {
    console.error('Get pending requests error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get pending requests',
        code: 'GET_PENDING_FAILED',
      },
    });
  }
};

/**
 * Get outgoing follow requests that are still pending.
 */
exports.getSentRequests = async (req, res) => {
  try {
    const requests = await FollowModel.getSentRequests(req.user.id);
    res.json({ requests });
  } catch (error) {
    console.error('Get sent requests error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get sent requests',
        code: 'GET_SENT_FAILED',
      },
    });
  }
};

/**
 * Get follower / following counts and pending count for the current user.
 */
exports.getCounts = async (req, res) => {
  try {
    const counts = await FollowModel.getCounts(req.user.id);
    res.json({ counts });
  } catch (error) {
    console.error('Get counts error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get counts',
        code: 'GET_COUNTS_FAILED',
      },
    });
  }
};
