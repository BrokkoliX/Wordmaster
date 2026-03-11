/**
 * serverConfig — runtime system settings singleton.
 *
 * Loads all rows from server_config into an in-memory Map on startup.
 * Hot-path reads (e.g. rate limiters) hit the cache with no DB round-trip.
 * Writes go to the DB first, then update the cache so changes are instant.
 */

const { query } = require('./database');

// In-memory cache: key → parsed JS value
const cache = new Map();

/**
 * Load all rows from server_config into the cache.
 * Called once at startup. Failures are logged but non-fatal — the
 * defaults baked into server.js will remain in effect.
 */
async function load() {
  try {
    const result = await query(
      'SELECT key, value, type FROM server_config ORDER BY category, key'
    );
    for (const row of result.rows) {
      cache.set(row.key, parseValue(row.value, row.type));
    }
    console.log(`[serverConfig] loaded ${cache.size} setting(s)`);
  } catch (err) {
    console.warn('[serverConfig] could not load settings from DB — using hardcoded defaults:', err.message);
  }
}

/**
 * Return the cached value for a key, or `defaultValue` if absent.
 *
 * @param {string} key
 * @param {*} defaultValue
 */
function get(key, defaultValue = undefined) {
  return cache.has(key) ? cache.get(key) : defaultValue;
}

/**
 * Write a new value to the DB and update the cache atomically.
 * Called by the admin controller after validation.
 *
 * @param {string} key
 * @param {*}      value   — already-parsed JS value
 * @param {string} updatedBy
 */
async function set(key, value, updatedBy) {
  await query(
    `UPDATE server_config
     SET value = $1::jsonb, updated_by = $2
     WHERE key = $3`,
    [JSON.stringify(value), updatedBy, key]
  );
  cache.set(key, value);
}

/**
 * Re-read all rows from the DB and refresh the cache.
 * Useful after a bulk import or direct DB edit.
 */
async function reload() {
  cache.clear();
  await load();
}

/**
 * Return every cached entry as an array (for debugging / health checks).
 */
function all() {
  return Array.from(cache.entries()).map(([key, value]) => ({ key, value }));
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * JSONB values come back from pg already parsed by the node-postgres driver,
 * so this is mostly a safety net for unexpected string types.
 */
function parseValue(raw, type) {
  if (raw === null || raw === undefined) return null;

  // pg already deserialises JSONB columns into JS objects/primitives
  if (typeof raw !== 'string') return raw;

  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

module.exports = { load, get, set, reload, all };
