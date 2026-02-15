const express = require('express');
const router = express.Router();
const { getWords, getWordCount, getLanguages } = require('../controllers/words.controller');

// GET /api/words?source_lang=en&target_lang=es&cefr_level=A1&limit=500&offset=0
router.get('/', getWords);

// GET /api/words/count?source_lang=en&target_lang=es&cefr_level=A1
router.get('/count', getWordCount);

// GET /api/words/languages
router.get('/languages', getLanguages);

module.exports = router;
