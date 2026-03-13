const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const leaderboardController = require('../controllers/leaderboard.controller');

const router = express.Router();

/**
 * @route   GET /api/leaderboard/global
 * @desc    Top N users globally
 * @query   scope=all_time|weekly|monthly  limit=50  offset=0
 * @access  Private
 */
router.get('/global', authenticate, leaderboardController.getGlobal);

/**
 * @route   GET /api/leaderboard/friends
 * @desc    Leaderboard scoped to the user's follow graph
 * @query   scope=all_time|weekly|monthly
 * @access  Private
 */
router.get('/friends', authenticate, leaderboardController.getFriends);

/**
 * @route   GET /api/leaderboard/me
 * @desc    Requesting user's own rank + XP totals
 * @query   scope=all_time|weekly|monthly
 * @access  Private
 */
router.get('/me', authenticate, leaderboardController.getMe);

module.exports = router;
