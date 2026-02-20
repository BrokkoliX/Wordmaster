const express = require('express');
const router = express.Router();
const { getSentences, getSentenceCount, getTopics } = require('../controllers/sentences.controller');

// GET /api/sentences?language=de&cefr_level=A1&topic=present_tense&limit=200&offset=0
router.get('/', getSentences);

// GET /api/sentences/count?language=de&cefr_level=A1
router.get('/count', getSentenceCount);

// GET /api/sentences/topics?language=de
router.get('/topics', getTopics);

module.exports = router;
