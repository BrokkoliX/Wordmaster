const { query } = require('../config/database');
const serverConfig = require('../config/serverConfig');

// ── Validation ────────────────────────────────────────────────────────────────

const VALID_TYPES = ['number', 'boolean', 'string', 'json'];

/**
 * Coerce and validate `raw` against the declared `type`.
 * Returns { ok: true, value } or { ok: false, message }.
 */
function validateValue(raw, type) {
  try {
    switch (type) {
      case 'number': {
        const n = Number(raw);
        if (isNaN(n)) return { ok: false, message: 'Value must be a number' };
        return { ok: true, value: n };
      }
      case 'boolean': {
        if (typeof raw === 'boolean') return { ok: true, value: raw };
        if (raw === 'true'  || raw === 1) return { ok: true, value: true };
        if (raw === 'false' || raw === 0) return { ok: true, value: false };
        return { ok: false, message: 'Value must be true or false' };
      }
      case 'string': {
        if (typeof raw !== 'string') return { ok: false, message: 'Value must be a string' };
        return { ok: true, value: raw };
      }
      case 'json': {
        // Accept either a pre-parsed object or a JSON string
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          return { ok: false, message: 'Value must be a JSON object' };
        }
        return { ok: true, value: parsed };
      }
      default:
        return { ok: false, message: `Unknown type: ${type}` };
    }
  } catch {
    return { ok: false, message: 'Invalid value format' };
  }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/server-config
 * Return all settings grouped by category.
 */
const getAll = async (req, res) => {
  try {
    const result = await query(
      `SELECT key, value, type, label, category, notes, updated_at, updated_by
       FROM server_config
       ORDER BY category, key`
    );

    // Group by category
    const grouped = {};
    for (const row of result.rows) {
      if (!grouped[row.category]) grouped[row.category] = [];
      grouped[row.category].push(row);
    }

    res.json({ settings: grouped });
  } catch (error) {
    console.error('server-config getAll error:', error);
    res.status(500).json({ error: { message: 'Failed to fetch system settings' } });
  }
};

/**
 * PUT /api/admin/server-config/:key
 * Update one setting. Validates against the stored type.
 *
 * Body: { value: <new value> }
 */
const update = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const updatedBy = req.user?.email || req.user?.id || 'admin';

    if (value === undefined) {
      return res.status(400).json({ error: { message: '"value" is required' } });
    }

    // Fetch the existing row to get the declared type
    const existing = await query(
      'SELECT key, type, label FROM server_config WHERE key = $1',
      [key]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: { message: `Setting "${key}" not found` } });
    }

    const { type } = existing.rows[0];
    const validation = validateValue(value, type);

    if (!validation.ok) {
      return res.status(400).json({ error: { message: validation.message } });
    }

    // Persist and update the in-memory cache
    await serverConfig.set(key, validation.value, updatedBy);

    // Return the full updated row
    const updated = await query(
      'SELECT key, value, type, label, category, notes, updated_at, updated_by FROM server_config WHERE key = $1',
      [key]
    );

    res.json({
      message: `Setting "${key}" updated`,
      setting: updated.rows[0],
    });
  } catch (error) {
    console.error('server-config update error:', error);
    res.status(500).json({ error: { message: 'Failed to update setting' } });
  }
};

module.exports = { getAll, update };
