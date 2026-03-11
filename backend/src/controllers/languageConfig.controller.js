const { query } = require('../config/database');

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * All learning-mode slugs recognised by the mobile app.
 * Matches the mode cards in ModeSelectionScreen.js.
 */
const VALID_FEATURES = [
  'multiple_choice',
  'matching_pairs',
  'type_translation',
  'fill_in_blank',
  'smart_review',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Validate and sanitise a features object.
 * Unknown keys are dropped; values are coerced to booleans.
 *
 * @param {object} raw
 * @returns {{ features: object, unknown: string[] }}
 */
function sanitiseFeatures(raw) {
  const features = {};
  const unknown = [];

  for (const [key, value] of Object.entries(raw)) {
    if (VALID_FEATURES.includes(key)) {
      features[key] = Boolean(value);
    } else {
      unknown.push(key);
    }
  }

  return { features, unknown };
}

// ── Admin handlers ────────────────────────────────────────────────────────────

/**
 * GET /api/admin/language-config
 * Return every row from language_config, ordered by type then id.
 */
const getAll = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, type, enabled, features, notes, updated_at, updated_by
       FROM language_config
       ORDER BY type DESC, id ASC`
      // type DESC so 'pair' rows come before 'language' rows alphabetically
      // (p > l), but callers can re-sort client-side
    );

    res.json({ configs: result.rows });
  } catch (error) {
    console.error('language-config getAll error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch language config' } });
  }
};

/**
 * GET /api/admin/language-config/:id
 * Return one config entry by its id (language code or pair slug).
 */
const getOne = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT id, type, enabled, features, notes, updated_at, updated_by
       FROM language_config
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { message: 'Config entry not found' } });
    }

    res.json({ config: result.rows[0] });
  } catch (error) {
    console.error('language-config getOne error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch config entry' } });
  }
};

/**
 * PUT /api/admin/language-config/:id
 * Upsert a config entry.
 *
 * Body (all optional):
 *   type     – 'language' | 'pair'   (required only on first creation)
 *   enabled  – boolean
 *   features – { multiple_choice, matching_pairs, type_translation,
 *                fill_in_blank, smart_review }
 *   notes    – string
 */
const upsert = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, enabled, features, notes } = req.body;
    const updatedBy = req.user?.email || req.user?.id || 'admin';

    // ── Validate type ────────────────────────────────────────────────────────
    const validTypes = ['language', 'pair'];
    if (type !== undefined && !validTypes.includes(type)) {
      return res.status(400).json({
        error: { message: `type must be one of: ${validTypes.join(', ')}` },
      });
    }

    // ── Validate features ────────────────────────────────────────────────────
    let cleanFeatures = null;
    let unknownFeatures = [];

    if (features !== undefined) {
      if (typeof features !== 'object' || Array.isArray(features)) {
        return res.status(400).json({
          error: { message: 'features must be a plain object' },
        });
      }
      const sanitised = sanitiseFeatures(features);
      cleanFeatures = sanitised.features;
      unknownFeatures = sanitised.unknown;
    }

    // ── Check if row already exists ──────────────────────────────────────────
    const existing = await query(
      'SELECT id, type FROM language_config WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      // INSERT – type is required for a new row
      if (!type) {
        return res.status(400).json({
          error: { message: 'type is required when creating a new config entry' },
        });
      }

      const result = await query(
        `INSERT INTO language_config (id, type, enabled, features, notes, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, type, enabled, features, notes, updated_at, updated_by`,
        [
          id,
          type,
          enabled !== undefined ? Boolean(enabled) : false,
          JSON.stringify(cleanFeatures ?? {}),
          notes ?? null,
          updatedBy,
        ]
      );

      return res.status(201).json({
        config: result.rows[0],
        warnings: unknownFeatures.length
          ? [`Unknown feature keys ignored: ${unknownFeatures.join(', ')}`]
          : [],
      });
    }

    // UPDATE – build dynamic set clause
    const updates = [];
    const values = [];
    let p = 1;

    if (enabled !== undefined) {
      updates.push(`enabled = $${p++}`);
      values.push(Boolean(enabled));
    }

    if (cleanFeatures !== null) {
      // Merge into existing features rather than overwriting entirely,
      // so a caller toggling only fill_in_blank doesn't wipe other keys.
      updates.push(`features = features || $${p++}::jsonb`);
      values.push(JSON.stringify(cleanFeatures));
    }

    if (notes !== undefined) {
      updates.push(`notes = $${p++}`);
      values.push(notes);
    }

    updates.push(`updated_by = $${p++}`);
    values.push(updatedBy);

    if (updates.length === 1) {
      // Only updated_by would change – nothing meaningful to update
      return res.status(400).json({ error: { message: 'No valid fields to update' } });
    }

    values.push(id);
    const result = await query(
      `UPDATE language_config
       SET ${updates.join(', ')}
       WHERE id = $${p}
       RETURNING id, type, enabled, features, notes, updated_at, updated_by`,
      values
    );

    res.json({
      config: result.rows[0],
      warnings: unknownFeatures.length
        ? [`Unknown feature keys ignored: ${unknownFeatures.join(', ')}`]
        : [],
    });
  } catch (error) {
    console.error('language-config upsert error:', error);
    res.status(500).json({ error: { message: 'Failed to update config entry' } });
  }
};

// ── Public handler ────────────────────────────────────────────────────────────

/**
 * GET /api/config/languages
 * Public endpoint consumed by the mobile app on startup.
 * Returns only enabled language rows and enabled pair rows with their
 * feature flags, so the mobile client knows what to show.
 */
const getPublicConfig = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, type, features
       FROM language_config
       WHERE enabled = true
       ORDER BY type DESC, id ASC`
    );

    const languages = result.rows
      .filter((r) => r.type === 'language')
      .map((r) => r.id);

    const pairs = result.rows
      .filter((r) => r.type === 'pair')
      .map((r) => ({ id: r.id, features: r.features }));

    res.json({ languages, pairs });
  } catch (error) {
    console.error('language-config getPublicConfig error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch language config' } });
  }
};

module.exports = {
  getAll,
  getOne,
  upsert,
  getPublicConfig,
  VALID_FEATURES,
};
