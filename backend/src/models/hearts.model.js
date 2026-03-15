const { query } = require('../config/database');
const serverConfig = require('../config/serverConfig');

class HeartsModel {
  /**
   * Return the user's heart row, creating one if it doesn't exist.
   * The returned row includes raw DB values; refill computation is done
   * in getHeartsWithRefill().
   *
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  static async getOrCreate(userId) {
    const startingHearts = serverConfig.get('hearts.starting_count', 5);

    const result = await query(
      `INSERT INTO user_hearts (user_id, current_hearts)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO NOTHING
       RETURNING *`,
      [userId, startingHearts]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Row already existed — fetch it.
    const existing = await query(
      'SELECT * FROM user_hearts WHERE user_id = $1',
      [userId]
    );
    return existing.rows[0];
  }

  /**
   * Return the user's current hearts after applying any accrued passive refills
   * since last_refill_at. Updates the DB row if hearts were added.
   *
   * @param {string} userId
   * @returns {Promise<{ current_hearts: number, hearts_max: number, next_refill_at: string|null }>}
   */
  static async getHeartsWithRefill(userId) {
    const row = await HeartsModel.getOrCreate(userId);

    const heartsMax = serverConfig.get('hearts.starting_count', 5);
    const refillIntervalMs = serverConfig.get('hearts.refill_interval_ms', 1200000); // 20 min

    if (row.current_hearts >= heartsMax) {
      // Already full — nothing to refill.
      return {
        current_hearts: row.current_hearts,
        hearts_max: heartsMax,
        next_refill_at: null,
      };
    }

    // How many refills have accrued since last_refill_at?
    const elapsed = Date.now() - new Date(row.last_refill_at).getTime();
    const refillsEarned = Math.floor(elapsed / refillIntervalMs);

    if (refillsEarned <= 0) {
      // No refill earned yet — compute when the next one will land.
      const msUntilNext = refillIntervalMs - elapsed;
      return {
        current_hearts: row.current_hearts,
        hearts_max: heartsMax,
        next_refill_at: new Date(Date.now() + msUntilNext).toISOString(),
      };
    }

    const newHearts = Math.min(row.current_hearts + refillsEarned, heartsMax);

    // Advance last_refill_at by exactly the number of refills consumed,
    // so partial elapsed time is preserved.
    const msConsumed = refillsEarned * refillIntervalMs;
    const newRefillAt = new Date(new Date(row.last_refill_at).getTime() + msConsumed);

    await query(
      `UPDATE user_hearts
       SET current_hearts = $1, last_refill_at = $2, updated_at = NOW()
       WHERE user_id = $3`,
      [newHearts, newRefillAt.toISOString(), userId]
    );

    // Compute next refill time if still not full.
    let nextRefillAt = null;
    if (newHearts < heartsMax) {
      const remainingElapsed = Date.now() - newRefillAt.getTime();
      const msUntilNext = refillIntervalMs - remainingElapsed;
      nextRefillAt = new Date(Date.now() + msUntilNext).toISOString();
    }

    return {
      current_hearts: newHearts,
      hearts_max: heartsMax,
      next_refill_at: nextRefillAt,
    };
  }

  /**
   * Deduct one heart. Returns the updated count.
   * Returns null if already at 0.
   *
   * @param {string} userId
   * @returns {Promise<{ current_hearts: number, hearts_depleted: boolean } | null>}
   */
  static async useHeart(userId) {
    // Apply any pending refills first.
    await HeartsModel.getHeartsWithRefill(userId);

    const result = await query(
      `UPDATE user_hearts
       SET current_hearts = GREATEST(current_hearts - 1, 0),
           updated_at = NOW()
       WHERE user_id = $1
         AND current_hearts > 0
       RETURNING current_hearts`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Either the user doesn't exist or hearts are already 0.
      const row = await HeartsModel.getOrCreate(userId);
      return {
        current_hearts: row.current_hearts,
        hearts_depleted: row.current_hearts <= 0,
      };
    }

    const newCount = result.rows[0].current_hearts;
    return {
      current_hearts: newCount,
      hearts_depleted: newCount <= 0,
    };
  }

  /**
   * Add hearts from a rewarded ad. Clamped to hearts_max.
   * Also inserts an ad event row.
   *
   * @param {string} userId
   * @returns {Promise<{ current_hearts: number, hearts_max: number }>}
   */
  static async adRefill(userId) {
    const heartsMax = serverConfig.get('hearts.starting_count', 5);
    const refillAmount = serverConfig.get('hearts.ad_refill_amount', 3);

    const result = await query(
      `UPDATE user_hearts
       SET current_hearts = LEAST(current_hearts + $1, $2),
           last_refill_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $3
       RETURNING current_hearts`,
      [refillAmount, heartsMax, userId]
    );

    if (result.rows.length === 0) {
      // Row didn't exist — create and try again.
      await HeartsModel.getOrCreate(userId);
      return HeartsModel.adRefill(userId);
    }

    // Log the ad event.
    await query(
      `INSERT INTO user_ad_events (user_id, event_type) VALUES ($1, 'heart_refill')`,
      [userId]
    );

    return {
      current_hearts: result.rows[0].current_hearts,
      hearts_max: heartsMax,
    };
  }

  /**
   * Count how many ad events of the given type the user has today.
   *
   * @param {string} userId
   * @param {string} eventType
   * @returns {Promise<number>}
   */
  static async countTodayAdEvents(userId, eventType) {
    const result = await query(
      `SELECT COUNT(*)::int AS count
       FROM user_ad_events
       WHERE user_id = $1
         AND event_type = $2
         AND created_at >= CURRENT_DATE`,
      [userId, eventType]
    );
    return result.rows[0].count;
  }

  /**
   * Check whether the user is within the onboarding grace period.
   * Grace period = first N hours OR first M sessions, whichever comes first.
   *
   * @param {string} userId
   * @returns {Promise<boolean>} true if still in grace period
   */
  static async isInGracePeriod(userId) {
    const graceHours = serverConfig.get('hearts.grace_period_hours', 24);
    const graceSessions = serverConfig.get('hearts.grace_period_sessions', 5);

    const result = await query(
      `SELECT
         u.created_at,
         (SELECT COUNT(*)::int FROM learning_sessions WHERE user_id = $1) AS session_count
       FROM users u
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) return false;

    const { created_at, session_count } = result.rows[0];
    const accountAgeMs = Date.now() - new Date(created_at).getTime();
    const graceMs = graceHours * 60 * 60 * 1000;

    // Grace period active if BOTH conditions are true:
    // the account is young enough AND the user hasn't completed enough sessions.
    return accountAgeMs < graceMs && session_count < graceSessions;
  }
}

module.exports = HeartsModel;
