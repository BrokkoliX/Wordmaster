/**
 * XP Service
 *
 * Local XP event queue that accrues XP events offline and drains them
 * into the progressSyncService payload for server processing.
 *
 * Call `awardXp()` at every natural event boundary (session completed,
 * achievement unlocked, etc.). Call `flushQueue()` from the sync service
 * to drain pending events into the sync payload.
 */

import db from './sqliteConnection';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCAL_TOTAL_KEY = 'xp_local_total';

/**
 * Ensure the xp_event_queue table exists.
 * Called once during app init (from database.js initDatabase).
 */
export const initXpTable = async () => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS xp_event_queue (
      id           TEXT PRIMARY KEY,
      event_type   TEXT NOT NULL,
      reference_id TEXT,
      base_xp_override INTEGER,
      occurred_at  TEXT NOT NULL,
      synced       INTEGER DEFAULT 0
    );
  `);
};

/**
 * Queue an XP event locally.
 *
 * @param {string} eventType   - Must match a key in the backend's xp_rules table.
 * @param {string|null} referenceId - Unique ref for one-time dedup (e.g. wordId).
 * @param {number|null} baseXpOverride - Override base_xp for achievement_unlocked events.
 */
export const awardXp = async (eventType, referenceId = null, baseXpOverride = null) => {
  try {
    const id = `xp_${eventType}_${referenceId || ''}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const occurredAt = new Date().toISOString();

    await db.runAsync(
      `INSERT INTO xp_event_queue (id, event_type, reference_id, base_xp_override, occurred_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, eventType, referenceId, baseXpOverride, occurredAt]
    );

    // Optimistic local total bump (best-effort estimate using base XP values)
    const estimate = baseXpOverride || _estimateXp(eventType);
    if (estimate > 0) {
      const current = parseInt((await AsyncStorage.getItem(LOCAL_TOTAL_KEY)) || '0', 10);
      await AsyncStorage.setItem(LOCAL_TOTAL_KEY, String(current + estimate));
    }
  } catch (error) {
    // Non-fatal — event will not be tracked but app continues normally.
    console.warn('xpService.awardXp failed:', error.message);
  }
};

/**
 * Drain all pending (unsynced) XP events from the local queue.
 * Returns an array shaped for the backend's xpEvents[] payload.
 * Marks returned rows as synced so they are not sent again.
 *
 * Called by progressSyncService before POSTing to /progress/sync.
 */
export const flushQueue = async () => {
  try {
    const rows = await db.getAllAsync(
      `SELECT * FROM xp_event_queue WHERE synced = 0 ORDER BY occurred_at ASC LIMIT 500`
    );

    if (rows.length === 0) return [];

    // Mark as synced before returning (if the sync fails, progressSyncService
    // will call resetQueue to un-mark them for retry).
    const ids = rows.map((r) => r.id);
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE xp_event_queue SET synced = 1 WHERE id IN (${placeholders})`,
      ids
    );

    return rows.map((r) => ({
      eventType: r.event_type,
      referenceId: r.reference_id || undefined,
      occurredAt: r.occurred_at,
      baseXpOverride: r.base_xp_override || undefined,
    }));
  } catch (error) {
    console.warn('xpService.flushQueue failed:', error.message);
    return [];
  }
};

/**
 * Roll back a flush if the sync request itself failed.
 * Re-marks events as unsynced so the next sync picks them up.
 */
export const resetQueue = async () => {
  try {
    await db.runAsync(`UPDATE xp_event_queue SET synced = 0 WHERE synced = 1`);
  } catch (error) {
    console.warn('xpService.resetQueue failed:', error.message);
  }
};

/**
 * Purge successfully synced events older than 7 days to keep SQLite lean.
 */
export const purgeOldEvents = async () => {
  try {
    await db.runAsync(
      `DELETE FROM xp_event_queue WHERE synced = 1 AND occurred_at < datetime('now', '-7 days')`
    );
  } catch (error) {
    console.warn('xpService.purgeOldEvents failed:', error.message);
  }
};

/**
 * Read the optimistic local XP total.
 * Used for instant UI display without a server round-trip.
 */
export const getLocalTotal = async () => {
  try {
    const val = await AsyncStorage.getItem(LOCAL_TOTAL_KEY);
    return parseInt(val || '0', 10);
  } catch {
    return 0;
  }
};

/**
 * Overwrite the local total after a server sync confirms the canonical value.
 */
export const setLocalTotal = async (total) => {
  try {
    await AsyncStorage.setItem(LOCAL_TOTAL_KEY, String(total));
  } catch {
    // Non-fatal
  }
};

// ────────────── helpers ──────────────

/**
 * Best-effort XP estimate for optimistic display.
 * These values mirror the backend's xp_rules seed data.
 */
function _estimateXp(eventType) {
  const estimates = {
    session_completed: 10,
    word_mastered: 5,
    perfect_session: 25,
    daily_streak_maintained: 5,
    streak_milestone_7: 50,
    streak_milestone_30: 200,
    streak_milestone_100: 500,
    streak_milestone_365: 2000,
    daily_challenge_completed: 30,
    words_reviewed: 1,
    cefr_level_advanced: 100,
    language_added: 50,
  };
  return estimates[eventType] || 0;
}

export default {
  initXpTable,
  awardXp,
  flushQueue,
  resetQueue,
  purgeOldEvents,
  getLocalTotal,
  setLocalTotal,
};
