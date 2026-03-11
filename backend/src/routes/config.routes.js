const express = require('express');
const router = express.Router();
const { getPublicConfig } = require('../controllers/languageConfig.controller');

// GET /api/config/languages
// Public – no auth required. Returns enabled languages and pairs with feature flags.
router.get('/languages', getPublicConfig);

module.exports = router;
