const express = require('express');
const { authenticate } = require('../middleware/auth.middleware');
const progressController = require('../controllers/progress.controller');

const router = express.Router();

/**
 * @route   POST /api/progress/sync
 * @desc    Sync user progress (word progress, sessions, achievements, settings)
 * @access  Private
 */
router.post('/sync', authenticate, progressController.syncProgress);

/**
 * @route   GET /api/progress/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get('/stats', authenticate, progressController.getStats);

/**
 * @route   GET /api/progress/export
 * @desc    Export all user progress
 * @access  Private
 */
router.get('/export', authenticate, progressController.exportProgress);

/**
 * @route   GET /api/progress/settings
 * @desc    Get user settings
 * @access  Private
 */
router.get('/settings', authenticate, progressController.getSettings);

/**
 * @route   PUT /api/progress/settings
 * @desc    Update user settings
 * @access  Private
 */
router.put('/settings', authenticate, progressController.updateSettings);

module.exports = router;
