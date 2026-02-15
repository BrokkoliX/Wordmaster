const db = require('../config/database');

/**
 * GET /api/words
 *
 * Returns words filtered by language pair and CEFR level.
 *
 * Query params:
 *   source_lang  - required (e.g. "en")
 *   target_lang  - required (e.g. "es")
 *   cefr_level   - optional, returns words at this level and below (e.g. "B1")
 *   category     - optional filter
 *   limit        - optional, default 500
 *   offset       - optional, default 0
 */
const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const getWords = async (req, res) => {
  try {
    const { source_lang, target_lang, cefr_level, category, limit = 500, offset = 0 } = req.query;

    if (!source_lang || !target_lang) {
      return res.status(400).json({ error: 'source_lang and target_lang are required' });
    }

    const params = [source_lang, target_lang];
    const conditions = ['source_lang = $1', 'target_lang = $2'];
    let paramIndex = 3;

    // Filter to the requested level and all levels below it
    if (cefr_level) {
      const levelIndex = CEFR_ORDER.indexOf(cefr_level.toUpperCase());
      if (levelIndex === -1) {
        return res.status(400).json({ error: `Invalid cefr_level. Must be one of: ${CEFR_ORDER.join(', ')}` });
      }
      const allowedLevels = CEFR_ORDER.slice(0, levelIndex + 1);
      conditions.push(`cefr_level = ANY($${paramIndex})`);
      params.push(allowedLevels);
      paramIndex++;
    }

    if (category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    const where = conditions.join(' AND ');

    // Get total count for this filter
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM words WHERE ${where}`,
      params
    );

    // Get the words
    params.push(parseInt(limit, 10));
    params.push(parseInt(offset, 10));

    const result = await db.query(
      `SELECT id, word, translation, difficulty, category, frequency_rank, cefr_level, source_lang, target_lang
       FROM words
       WHERE ${where}
       ORDER BY frequency_rank ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    res.json({
      total: parseInt(countResult.rows[0].total, 10),
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      words: result.rows,
    });
  } catch (error) {
    console.error('Error fetching words:', error);
    res.status(500).json({ error: 'Failed to fetch words' });
  }
};

/**
 * GET /api/words/count
 *
 * Returns the word count for a given language pair, optionally filtered by level.
 */
const getWordCount = async (req, res) => {
  try {
    const { source_lang, target_lang, cefr_level } = req.query;

    if (!source_lang || !target_lang) {
      return res.status(400).json({ error: 'source_lang and target_lang are required' });
    }

    const params = [source_lang, target_lang];
    const conditions = ['source_lang = $1', 'target_lang = $2'];

    if (cefr_level) {
      const levelIndex = CEFR_ORDER.indexOf(cefr_level.toUpperCase());
      if (levelIndex >= 0) {
        const allowedLevels = CEFR_ORDER.slice(0, levelIndex + 1);
        conditions.push('cefr_level = ANY($3)');
        params.push(allowedLevels);
      }
    }

    const result = await db.query(
      `SELECT COUNT(*) as total FROM words WHERE ${conditions.join(' AND ')}`,
      params
    );

    res.json({ total: parseInt(result.rows[0].total, 10) });
  } catch (error) {
    console.error('Error fetching word count:', error);
    res.status(500).json({ error: 'Failed to fetch word count' });
  }
};

/**
 * GET /api/words/languages
 *
 * Returns all available language pairs with word counts.
 */
const getLanguages = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT source_lang, target_lang, COUNT(*) as word_count
      FROM words
      GROUP BY source_lang, target_lang
      ORDER BY source_lang, target_lang
    `);

    res.json({ languages: result.rows });
  } catch (error) {
    console.error('Error fetching languages:', error);
    res.status(500).json({ error: 'Failed to fetch languages' });
  }
};

module.exports = { getWords, getWordCount, getLanguages };
