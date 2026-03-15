const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth.middleware');
const heartsController = require('../controllers/hearts.controller');

/**
 * GET /api/hearts
 * Returns the user's current heart count after applying accrued refills.
 */
router.get('/', authenticate, heartsController.getHearts);

/**
 * POST /api/hearts/use
 * Deducts one heart after an incorrect answer.
 */
router.post('/use', authenticate, heartsController.useHeart);

/**
 * POST /api/hearts/ad-refill
 * Grants hearts after a completed rewarded video. Enforces daily cap.
 */
router.post('/ad-refill', authenticate, heartsController.adRefill);

module.exports = router;
