const { query } = require('../config/database');

// ========== USER MANAGEMENT ==========

/**
 * GET /api/admin/users
 * List all users with pagination, search, and filters
 */
const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      role = '',
      sortBy = 'created_at',
      sortOrder = 'DESC',
    } = req.query;

    const offset = (page - 1) * limit;

    // Build query with filters
    let whereConditions = [];
    let params = [];
    let paramCount = 1;

    if (search) {
      whereConditions.push(
        `(email ILIKE $${paramCount} OR username ILIKE $${paramCount} OR 
          first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount})`
      );
      params.push(`%${search}%`);
      paramCount++;
    }

    if (role) {
      whereConditions.push(`role = $${paramCount}`);
      params.push(role);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );
    const totalUsers = parseInt(countResult.rows[0].total);

    // Get users
    params.push(limit, offset);
    const result = await query(
      `SELECT 
        id, email, username, first_name, last_name, role,
        email_verified, created_at, last_login_at,
        (SELECT COUNT(*) FROM user_word_progress WHERE user_id = users.id) as words_learned
      FROM users 
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    res.json({
      users: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limit),
      },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      error: { message: 'Failed to fetch users' },
    });
  }
};

/**
 * GET /api/admin/users/:id
 * Get detailed information about a specific user
 */
const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const userResult = await query(
      `SELECT 
        id, email, username, first_name, last_name, role,
        email_verified, created_at, updated_at, last_login_at,
        avatar_url
      FROM users WHERE id = $1`,
      [id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'User not found' },
      });
    }

    const user = userResult.rows[0];

    // Get user settings
    const settingsResult = await query(
      'SELECT * FROM user_settings WHERE user_id = $1',
      [id]
    );

    // Get progress stats
    const statsResult = await query(
      `SELECT 
        COUNT(*) as total_words,
        COUNT(*) FILTER (WHERE confidence_level >= 3) as mastered_words,
        AVG(confidence_level) as avg_confidence
      FROM user_word_progress WHERE user_id = $1`,
      [id]
    );

    // Get recent sessions
    const sessionsResult = await query(
      `SELECT * FROM learning_sessions 
      WHERE user_id = $1 
      ORDER BY start_time DESC 
      LIMIT 10`,
      [id]
    );

    res.json({
      user,
      settings: settingsResult.rows[0] || null,
      stats: statsResult.rows[0],
      recentSessions: sessionsResult.rows,
    });
  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      error: { message: 'Failed to fetch user details' },
    });
  }
};

/**
 * PUT /api/admin/users/:id
 * Update user information (role, email verification, etc.)
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, email_verified, username, email } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (role !== undefined) {
      updates.push(`role = $${paramCount}`);
      values.push(role);
      paramCount++;
    }

    if (email_verified !== undefined) {
      updates.push(`email_verified = $${paramCount}`);
      values.push(email_verified);
      paramCount++;
    }

    if (username !== undefined) {
      updates.push(`username = $${paramCount}`);
      values.push(username);
      paramCount++;
    }

    if (email !== undefined) {
      updates.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: { message: 'No valid fields to update' },
      });
    }

    values.push(id);
    const result = await query(
      `UPDATE users 
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING id, email, username, role, email_verified, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'User not found' },
      });
    }

    res.json({
      message: 'User updated successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: { message: 'Failed to update user' },
    });
  }
};

/**
 * DELETE /api/admin/users/:id
 * Delete a user and all associated data
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const userCheck = await query('SELECT id FROM users WHERE id = $1', [id]);

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'User not found' },
      });
    }

    // Delete user (CASCADE will handle related data)
    await query('DELETE FROM users WHERE id = $1', [id]);

    res.json({
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: { message: 'Failed to delete user' },
    });
  }
};

/**
 * GET /api/admin/users/:id/progress
 * Get detailed learning progress for a user
 */
const getUserProgress = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        wp.*,
        w.word,
        w.translation,
        w.cefr_level,
        w.source_lang,
        w.target_lang
      FROM user_word_progress wp
      JOIN words w ON wp.word_id = w.id
      WHERE wp.user_id = $1
      ORDER BY wp.last_reviewed DESC`,
      [id]
    );

    res.json({
      progress: result.rows,
    });
  } catch (error) {
    console.error('Get user progress error:', error);
    res.status(500).json({
      error: { message: 'Failed to fetch user progress' },
    });
  }
};

// ========== LANGUAGE & VOCABULARY MANAGEMENT ==========

/**
 * GET /api/admin/languages
 * Get all available language pairs with statistics
 */
const getLanguages = async (req, res) => {
  try {
    const result = await query(
      `SELECT 
        source_lang,
        target_lang,
        COUNT(*) as word_count,
        COUNT(DISTINCT cefr_level) as levels_available,
        MIN(cefr_level) as min_level,
        MAX(cefr_level) as max_level
      FROM words
      GROUP BY source_lang, target_lang
      ORDER BY source_lang, target_lang`
    );

    res.json({
      languages: result.rows,
    });
  } catch (error) {
    console.error('Get languages error:', error);
    res.status(500).json({
      error: { message: 'Failed to fetch languages' },
    });
  }
};

/**
 * POST /api/admin/languages
 * Add a new language pair (just marks it as available)
 */
const addLanguage = async (req, res) => {
  try {
    const { source_lang, target_lang, name } = req.body;

    if (!source_lang || !target_lang) {
      return res.status(400).json({
        error: { message: 'source_lang and target_lang are required' },
      });
    }

    // You might want to create a separate languages table
    // For now, we'll just return success as languages are implicit from words table
    res.json({
      message: 'Language pair registered. Import words to activate.',
      language: { source_lang, target_lang, name },
    });
  } catch (error) {
    console.error('Add language error:', error);
    res.status(500).json({
      error: { message: 'Failed to add language' },
    });
  }
};

/**
 * GET /api/admin/words/stats
 * Get comprehensive word database statistics
 */
const getWordStats = async (req, res) => {
  try {
    // Overall stats
    const totalResult = await query('SELECT COUNT(*) as total FROM words');

    // By language pair
    const byLangResult = await query(
      `SELECT source_lang, target_lang, COUNT(*) as count
      FROM words
      GROUP BY source_lang, target_lang`
    );

    // By CEFR level
    const byCefrResult = await query(
      `SELECT cefr_level, COUNT(*) as count
      FROM words
      GROUP BY cefr_level
      ORDER BY cefr_level`
    );

    // By category
    const byCategoryResult = await query(
      `SELECT category, COUNT(*) as count
      FROM words
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
      LIMIT 20`
    );

    res.json({
      total: parseInt(totalResult.rows[0].total),
      byLanguagePair: byLangResult.rows,
      byCefrLevel: byCefrResult.rows,
      byCategory: byCategoryResult.rows,
    });
  } catch (error) {
    console.error('Get word stats error:', error);
    res.status(500).json({
      error: { message: 'Failed to fetch word statistics' },
    });
  }
};

/**
 * POST /api/admin/words/import
 * Bulk import words from JSON or CSV
 * Expected format: { words: [{word, translation, cefr_level, source_lang, target_lang, ...}] }
 */
const importWords = async (req, res) => {
  try {
    const { words, source_lang, target_lang } = req.body;

    if (!words || !Array.isArray(words) || words.length === 0) {
      return res.status(400).json({
        error: { message: 'Invalid words array' },
      });
    }

    let imported = 0;
    let skipped = 0;
    let errors = [];

    for (const wordData of words) {
      try {
        const id = `${wordData.source_lang || source_lang}-${
          wordData.target_lang || target_lang
        }-${wordData.word}`.toLowerCase();

        await query(
          `INSERT INTO words (
            id, word, translation, difficulty, category, 
            frequency_rank, cefr_level, source_lang, target_lang
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (id) DO NOTHING`,
          [
            id,
            wordData.word,
            wordData.translation,
            wordData.difficulty || 1,
            wordData.category || null,
            wordData.frequency_rank || null,
            wordData.cefr_level || 'A1',
            wordData.source_lang || source_lang,
            wordData.target_lang || target_lang,
          ]
        );

        imported++;
      } catch (err) {
        skipped++;
        errors.push({
          word: wordData.word,
          error: err.message,
        });
      }
    }

    res.json({
      message: 'Import completed',
      imported,
      skipped,
      errors: errors.slice(0, 10), // Only return first 10 errors
    });
  } catch (error) {
    console.error('Import words error:', error);
    res.status(500).json({
      error: { message: 'Failed to import words' },
    });
  }
};

/**
 * DELETE /api/admin/words/:id
 * Delete a word from the database
 */
const deleteWord = async (req, res) => {
  try {
    const { id } = req.params;

    await query('DELETE FROM words WHERE id = $1', [id]);

    res.json({
      message: 'Word deleted successfully',
    });
  } catch (error) {
    console.error('Delete word error:', error);
    res.status(500).json({
      error: { message: 'Failed to delete word' },
    });
  }
};

/**
 * PUT /api/admin/words/:id
 * Update a word
 */
const updateWord = async (req, res) => {
  try {
    const { id } = req.params;
    const { word, translation, cefr_level, category, difficulty } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (word !== undefined) {
      updates.push(`word = $${paramCount}`);
      values.push(word);
      paramCount++;
    }

    if (translation !== undefined) {
      updates.push(`translation = $${paramCount}`);
      values.push(translation);
      paramCount++;
    }

    if (cefr_level !== undefined) {
      updates.push(`cefr_level = $${paramCount}`);
      values.push(cefr_level);
      paramCount++;
    }

    if (category !== undefined) {
      updates.push(`category = $${paramCount}`);
      values.push(category);
      paramCount++;
    }

    if (difficulty !== undefined) {
      updates.push(`difficulty = $${paramCount}`);
      values.push(difficulty);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        error: { message: 'No valid fields to update' },
      });
    }

    values.push(id);
    const result = await query(
      `UPDATE words 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Word not found' },
      });
    }

    res.json({
      message: 'Word updated successfully',
      word: result.rows[0],
    });
  } catch (error) {
    console.error('Update word error:', error);
    res.status(500).json({
      error: { message: 'Failed to update word' },
    });
  }
};

// ========== SENTENCE TEMPLATES ==========

const getSentences = async (req, res) => {
  try {
    const { language, cefr_level, limit = 100, offset = 0 } = req.query;

    let whereConditions = [];
    let params = [];
    let paramCount = 1;

    if (language) {
      whereConditions.push(`language = $${paramCount}`);
      params.push(language);
      paramCount++;
    }

    if (cefr_level) {
      whereConditions.push(`cefr_level = $${paramCount}`);
      params.push(cefr_level);
      paramCount++;
    }

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    params.push(limit, offset);
    const result = await query(
      `SELECT * FROM sentence_templates 
      ${whereClause}
      ORDER BY cefr_level, grammar_topic
      LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      params
    );

    res.json({
      sentences: result.rows,
    });
  } catch (error) {
    console.error('Get sentences error:', error);
    res.status(500).json({
      error: { message: 'Failed to fetch sentences' },
    });
  }
};

const addSentence = async (req, res) => {
  try {
    const {
      language,
      cefr_level,
      sentence,
      answer,
      distractors,
      hint,
      grammar_topic,
      difficulty,
    } = req.body;

    const id = `${language}-${Date.now()}`;

    const result = await query(
      `INSERT INTO sentence_templates (
        id, language, cefr_level, sentence, answer, 
        distractors, hint, grammar_topic, difficulty
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        id,
        language,
        cefr_level,
        sentence,
        answer,
        JSON.stringify(distractors),
        hint,
        grammar_topic,
        difficulty || 1,
      ]
    );

    res.status(201).json({
      message: 'Sentence added successfully',
      sentence: result.rows[0],
    });
  } catch (error) {
    console.error('Add sentence error:', error);
    res.status(500).json({
      error: { message: 'Failed to add sentence' },
    });
  }
};

const updateSentence = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Build dynamic update query
    const fields = Object.keys(updates);
    const values = fields.map((field, idx) => `${field} = $${idx + 1}`);
    const params = fields.map((field) => updates[field]);
    params.push(id);

    const result = await query(
      `UPDATE sentence_templates 
      SET ${values.join(', ')}
      WHERE id = $${params.length}
      RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: { message: 'Sentence not found' },
      });
    }

    res.json({
      message: 'Sentence updated successfully',
      sentence: result.rows[0],
    });
  } catch (error) {
    console.error('Update sentence error:', error);
    res.status(500).json({
      error: { message: 'Failed to update sentence' },
    });
  }
};

const deleteSentence = async (req, res) => {
  try {
    const { id } = req.params;

    await query('DELETE FROM sentence_templates WHERE id = $1', [id]);

    res.json({
      message: 'Sentence deleted successfully',
    });
  } catch (error) {
    console.error('Delete sentence error:', error);
    res.status(500).json({
      error: { message: 'Failed to delete sentence' },
    });
  }
};

// ========== PLATFORM STATISTICS ==========

const getPlatformStats = async (req, res) => {
  try {
    // Total users
    const usersResult = await query('SELECT COUNT(*) as total FROM users');

    // Active users (logged in last 30 days)
    const activeResult = await query(
      `SELECT COUNT(*) as active 
      FROM users 
      WHERE last_login_at >= NOW() - INTERVAL '30 days'`
    );

    // Total words
    const wordsResult = await query('SELECT COUNT(*) as total FROM words');

    // Total learning sessions
    const sessionsResult = await query(
      'SELECT COUNT(*) as total FROM learning_sessions'
    );

    // Average accuracy
    const accuracyResult = await query(
      `SELECT AVG(accuracy) as avg_accuracy 
      FROM learning_sessions 
      WHERE accuracy IS NOT NULL`
    );

    res.json({
      users: {
        total: parseInt(usersResult.rows[0].total),
        active: parseInt(activeResult.rows[0].active),
      },
      words: parseInt(wordsResult.rows[0].total),
      sessions: parseInt(sessionsResult.rows[0].total),
      averageAccuracy: parseFloat(accuracyResult.rows[0].avg_accuracy || 0).toFixed(2),
    });
  } catch (error) {
    console.error('Get platform stats error:', error);
    res.status(500).json({
      error: { message: 'Failed to fetch platform statistics' },
    });
  }
};

const getUserStats = async (req, res) => {
  try {
    // User growth over time (last 12 months)
    const growthResult = await query(
      `SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as new_users
      FROM users
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month`
    );

    // Users by role
    const byRoleResult = await query(
      `SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role`
    );

    res.json({
      growth: growthResult.rows,
      byRole: byRoleResult.rows,
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      error: { message: 'Failed to fetch user statistics' },
    });
  }
};

const getLearningStats = async (req, res) => {
  try {
    // Most popular language pairs
    const popularLangsResult = await query(
      `SELECT 
        us.learning_language,
        us.known_language,
        COUNT(*) as learners
      FROM user_settings us
      GROUP BY us.learning_language, us.known_language
      ORDER BY learners DESC`
    );

    // Words learned by level
    const byLevelResult = await query(
      `SELECT 
        w.cefr_level,
        COUNT(DISTINCT wp.user_id) as users_learning,
        COUNT(wp.id) as total_progress
      FROM user_word_progress wp
      JOIN words w ON wp.word_id = w.id
      GROUP BY w.cefr_level
      ORDER BY w.cefr_level`
    );

    res.json({
      popularLanguages: popularLangsResult.rows,
      byLevel: byLevelResult.rows,
    });
  } catch (error) {
    console.error('Get learning stats error:', error);
    res.status(500).json({
      error: { message: 'Failed to fetch learning statistics' },
    });
  }
};

// ========== DATABASE OPERATIONS ==========

const createBackup = async (req, res) => {
  try {
    // This would typically shell out to pg_dump or similar
    // For security, this is just a placeholder
    res.json({
      message: 'Backup functionality should be implemented with proper security',
      note: 'Use pg_dump via secure CLI access',
    });
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({
      error: { message: 'Failed to create backup' },
    });
  }
};

const checkDatabaseHealth = async (req, res) => {
  try {
    // Check connection
    await query('SELECT 1');

    // Get database size
    const sizeResult = await query(
      `SELECT pg_size_pretty(pg_database_size(current_database())) as size`
    );

    // Get table sizes
    const tablesResult = await query(
      `SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC`
    );

    res.json({
      status: 'healthy',
      database_size: sizeResult.rows[0].size,
      tables: tablesResult.rows,
    });
  } catch (error) {
    console.error('Database health check error:', error);
    res.status(500).json({
      error: { message: 'Database health check failed' },
    });
  }
};

module.exports = {
  // User management
  getAllUsers,
  getUserDetails,
  updateUser,
  deleteUser,
  getUserProgress,
  // Language & vocabulary
  getLanguages,
  addLanguage,
  getWordStats,
  importWords,
  deleteWord,
  updateWord,
  // Sentences
  getSentences,
  addSentence,
  updateSentence,
  deleteSentence,
  // Statistics
  getPlatformStats,
  getUserStats,
  getLearningStats,
  // Database
  createBackup,
  checkDatabaseHealth,
};
