const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, async (req, res) => {
  res.json({
    message: 'User profile endpoint - Coming soon',
    user: req.user,
  });
});

/**
 * @route   PUT /api/users/me
 * @desc    Update current user profile
 * @access  Private
 */
router.put('/me', authenticate, async (req, res) => {
  res.json({
    message: 'Update profile endpoint - Coming soon',
  });
});

module.exports = router;
