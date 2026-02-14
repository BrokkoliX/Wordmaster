const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

/**
 * @route   POST /api/progress/sync
 * @desc    Sync user progress
 * @access  Private
 */
router.post('/sync', authenticate, async (req, res) => {
  res.json({
    message: 'Progress sync endpoint - Coming soon',
  });
});

/**
 * @route   GET /api/progress/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get('/stats', authenticate, async (req, res) => {
  res.json({
    message: 'Statistics endpoint - Coming soon',
  });
});

module.exports = router;
