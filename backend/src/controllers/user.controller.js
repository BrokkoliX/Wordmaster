const { validationResult } = require('express-validator');
const UserModel = require('../models/user.model');

/**
 * Get current user profile
 */
exports.getProfile = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        avatarUrl: user.avatar_url,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get profile',
        code: 'GET_PROFILE_FAILED',
      },
    });
  }
};

/**
 * Update user profile
 */
exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: errors.array(),
        },
      });
    }

    const { username, firstName, lastName, avatarUrl } = req.body;

    // Check if username is taken by another user
    if (username) {
      const existingUser = await UserModel.findByUsername(username);
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(409).json({
          error: {
            message: 'Username already taken',
            code: 'USERNAME_TAKEN',
          },
        });
      }
    }

    const updates = {};
    if (username !== undefined) updates.username = username;
    if (firstName !== undefined) updates.first_name = firstName;
    if (lastName !== undefined) updates.last_name = lastName;
    if (avatarUrl !== undefined) updates.avatar_url = avatarUrl;

    const updatedUser = await UserModel.update(req.user.id, updates);

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        avatarUrl: updatedUser.avatar_url,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to update profile',
        code: 'UPDATE_PROFILE_FAILED',
      },
    });
  }
};

/**
 * Change password
 */
exports.changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: errors.array(),
        },
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password hash for verification
    const user = await UserModel.findByIdWithPassword(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      });
    }

    // Verify current password
    const isValidPassword = await UserModel.verifyPassword(user, currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({
        error: {
          message: 'Current password is incorrect',
          code: 'INVALID_PASSWORD',
        },
      });
    }

    // Update password
    await UserModel.updatePassword(req.user.id, newPassword);

    res.json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to change password',
        code: 'CHANGE_PASSWORD_FAILED',
      },
    });
  }
};

/**
 * Delete account
 */
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: {
          message: 'Password required to delete account',
          code: 'PASSWORD_REQUIRED',
        },
      });
    }

    // Get user with password hash for verification
    const user = await UserModel.findByIdWithPassword(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: {
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        },
      });
    }

    // Verify password
    const isValidPassword = await UserModel.verifyPassword(user, password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: {
          message: 'Password is incorrect',
          code: 'INVALID_PASSWORD',
        },
      });
    }

    // Delete user (CASCADE will delete related data)
    await UserModel.delete(req.user.id);

    res.json({
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to delete account',
        code: 'DELETE_ACCOUNT_FAILED',
      },
    });
  }
};
