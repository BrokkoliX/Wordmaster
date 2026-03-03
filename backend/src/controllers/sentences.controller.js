const db = require('../config/database');

const { CEFR_LEVELS: CEFR_ORDER } = require('../../../shared/constants/cefr-levels');

/**
 * GET /api/sentences
 *
 * Returns sentence templates filtered by language and CEFR level.
 *
 * Query params:
 *   language    - required (e.g. "de")
 *   cefr_level  - optional, returns templates at this level and below
 *   topic       - optional grammar_topic filter
 *   limit       - optional, default 200
 *   offset      - optional, default 0
 */
const getSentences = async (req, res) => {
  try {
    const { language, cefr_level, topic, limit = 200, offset = 0 } = req.query;

    if (!language) {
      return res.status(400).json({ error: 'language is required' });
    }

    const params = [language];
    const conditions = ['language = $1'];
    let paramIndex = 2;

    if (cefr_level) {
      const levelIndex = CEFR_ORDER.indexOf(cefr_level.toUpperCase());
      if (levelIndex === -1) {
        return res.status(400).json({
          error: `Invalid cefr_level. Must be one of: ${CEFR_ORDER.join(', ')}`,
        });
      }
      const allowedLevels = CEFR_ORDER.slice(0, levelIndex + 1);
      conditions.push(`cefr_level = ANY($${paramIndex})`);
      params.push(allowedLevels);
      paramIndex++;
    }

    if (topic) {
      conditions.push(`grammar_topic = $${paramIndex}`);
      params.push(topic);
      paramIndex++;
    }

    const where = conditions.join(' AND ');

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM sentence_templates WHERE ${where}`,
      params
    );

    params.push(parseInt(limit, 10));
    params.push(parseInt(offset, 10));

    const result = await db.query(
      `SELECT id, language, cefr_level, sentence, answer, answer_word_id,
              distractors, hint, grammar_topic, difficulty
       FROM sentence_templates
       WHERE ${where}
       ORDER BY difficulty ASC, id ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    res.json({
      total: parseInt(countResult.rows[0].total, 10),
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      sentences: result.rows,
    });
  } catch (error) {
    console.error('Error fetching sentences:', error);
    res.status(500).json({ error: 'Failed to fetch sentences' });
  }
};

/**
 * GET /api/sentences/count
 *
 * Returns the count of sentence templates for a language/level.
 */
const getSentenceCount = async (req, res) => {
  try {
    const { language, cefr_level } = req.query;

    if (!language) {
      return res.status(400).json({ error: 'language is required' });
    }

    const params = [language];
    const conditions = ['language = $1'];

    if (cefr_level) {
      const levelIndex = CEFR_ORDER.indexOf(cefr_level.toUpperCase());
      if (levelIndex >= 0) {
        const allowedLevels = CEFR_ORDER.slice(0, levelIndex + 1);
        conditions.push('cefr_level = ANY($2)');
        params.push(allowedLevels);
      }
    }

    const result = await db.query(
      `SELECT COUNT(*) as total FROM sentence_templates WHERE ${conditions.join(' AND ')}`,
      params
    );

    res.json({ total: parseInt(result.rows[0].total, 10) });
  } catch (error) {
    console.error('Error fetching sentence count:', error);
    res.status(500).json({ error: 'Failed to fetch sentence count' });
  }
};

/**
 * GET /api/sentences/topics
 *
 * Returns available grammar topics for a language with counts.
 */
const getTopics = async (req, res) => {
  try {
    const { language } = req.query;

    if (!language) {
      return res.status(400).json({ error: 'language is required' });
    }

    const result = await db.query(
      `SELECT grammar_topic, COUNT(*) as count
       FROM sentence_templates
       WHERE language = $1
       GROUP BY grammar_topic
       ORDER BY count DESC`,
      [language]
    );

    res.json({ topics: result.rows });
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ error: 'Failed to fetch topics' });
  }
};

module.exports = { getSentences, getSentenceCount, getTopics };
