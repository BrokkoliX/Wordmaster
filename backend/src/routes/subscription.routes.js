const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const subscriptionController = require('../controllers/subscription.controller');

/**
 * GET /api/subscriptions/me
 * Returns the calling user's active tier and public feature map.
 */
router.get('/me', authenticate, subscriptionController.getMySubscription);

module.exports = router;
