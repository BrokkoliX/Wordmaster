const { query, transaction } = require('../config/database');

/**
 * XP Model
 *
 * Handles server-authoritative XP processing and leaderboard queries.
 * The client sends event_type + reference_id; the server looks up base_xp
 * from xp_rules and applies multipliers itself so a tampered payload
 * cannot inflate scores.
 */

const MAX_BATCH_SIZE = 500;

// Future-tolerance window for client-reported timestamps
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
const MAX_AGE_DAYS = 30;

class XpModel {
  /**
   * Process a batch of XP events from a sync payload.
   *
   * Validates against xp_rules, deduplicates one-time events, inserts into
   * xp_events, and upserts user_xp totals — all inside a single transaction.
   *
   * @param {number} userId
   * @param {Array<{ eventType: string, referenceId?: string, occurredAt: string, baseXpOverride?: number }>} events
   * @param {string} subscriptionTier - 'free' | 'plus' | 'super'
   * @returns {{ accepted: number, rejected: number, totalAwarded: number }}
   */
  static async processEvents(userId, events, subscriptionTier = 'free') {
    if (!Array.isArray(events) || events.length === 0) {
      return { accepted: 0, rejected: 0, totalAwarded: 0 };
    }

    if (events.length > MAX_BATCH_SIZE) {
      throw Object.assign(
        new Error(`Batch size ${events.length} exceeds maximum of ${MAX_BATCH_SIZE}`),
        { status: 400, code: 'XP_BATCH_TOO_LARGE' }
      );
    }

    // Load all active rules once
    const rulesResult = await query(
      'SELECT * FROM xp_rules WHERE is_active = TRUE'
    );
    const rulesMap = {};
    for (const r of rulesResult.rows) {
      rulesMap[r.event_type] = r;
    }

    const multiplier = XpModel._tierMultiplier(subscriptionTier);

    const now = new Date();
    const futureLimit = new Date(now.getTime() + FUTURE_TOLERANCE_MS);
    const pastLimit = new Date(now.getTime() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

    let accepted = 0;
    let rejected = 0;
    let totalAwarded = 0;

    await transaction(async (client) => {
      for (const evt of events) {
        const { eventType, referenceId, occurredAt, baseXpOverride } = evt;

        // 1. Rule existence + active check
        const rule = rulesMap[eventType];
        if (!rule) {
          rejected++;
          continue;
        }

        // 2. Timestamp sanity
        const occurredDate = new Date(occurredAt);
        if (isNaN(occurredDate.getTime()) || occurredDate > futureLimit || occurredDate < pastLimit) {
          rejected++;
          continue;
        }

        // 3. Daily cap check (for repeatable events with a daily_cap)
        if (rule.daily_cap != null) {
          const dayStart = new Date(occurredDate);
          dayStart.setUTCHours(0, 0, 0, 0);
          const dayEnd = new Date(dayStart);
          dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

          const countResult = await client.query(
            `SELECT COUNT(*) AS cnt FROM xp_events
             WHERE user_id = $1 AND event_type = $2
               AND occurred_at >= $3 AND occurred_at < $4`,
            [userId, eventType, dayStart.toISOString(), dayEnd.toISOString()]
          );

          if (parseInt(countResult.rows[0].cnt, 10) >= rule.daily_cap) {
            rejected++;
            continue;
          }
        }

        // 4. Determine base XP
        // achievement_unlocked uses the achievement's own points value
        // passed as baseXpOverride; everything else uses the rule table.
        const baseXp = eventType === 'achievement_unlocked' && baseXpOverride != null
          ? baseXpOverride
          : rule.base_xp;

        const awardedXp = Math.round(baseXp * multiplier);

        // 5. Insert (silently skip duplicates for one-time events via UNIQUE index)
        try {
          await client.query(
            `INSERT INTO xp_events (user_id, event_type, reference_id, base_xp, multiplier, awarded_xp, occurred_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [userId, eventType, referenceId || null, baseXp, multiplier, awardedXp, occurredDate.toISOString()]
          );
          accepted++;
          totalAwarded += awardedXp;
        } catch (err) {
          // 23505 = unique_violation — expected for duplicate one-time events
          if (err.code === '23505') {
            rejected++;
            continue;
          }
          throw err;
        }
      }

      // 6. Upsert user_xp totals
      if (totalAwarded > 0) {
        await client.query(
          `INSERT INTO user_xp (user_id, total_xp, weekly_xp, monthly_xp, last_event_at, updated_at)
           VALUES ($1, $2, $2, $2, NOW(), NOW())
           ON CONFLICT (user_id) DO UPDATE SET
             total_xp   = user_xp.total_xp   + $2,
             weekly_xp  = user_xp.weekly_xp  + $2,
             monthly_xp = user_xp.monthly_xp + $2,
             last_event_at = NOW(),
             updated_at    = NOW()`,
          [userId, totalAwarded]
        );
      }
    });

    return { accepted, rejected, totalAwarded };
  }

  // ──────────────────────────────────────────────────────────
  // Leaderboard queries
  // ──────────────────────────────────────────────────────────

  /**
   * Return the top N users globally.
   *
   * @param {'all_time' | 'weekly' | 'monthly'} scope
   * @param {number} limit
   * @param {number} offset
   */
  static async getGlobalLeaderboard(scope = 'all_time', limit = 50, offset = 0) {
    const col = XpModel._scopeColumn(scope);

    const result = await query(
      `SELECT
         ROW_NUMBER() OVER (ORDER BY ux.${col} DESC, ux.last_event_at ASC) AS rank,
         ux.user_id,
         u.username,
         u.avatar_url,
         ux.total_xp,
         ux.weekly_xp,
         ux.monthly_xp
       FROM user_xp ux
       JOIN users u ON u.id = ux.user_id
       WHERE ux.${col} > 0
       ORDER BY ux.${col} DESC, ux.last_event_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return result.rows;
  }

  /**
   * Return leaderboard restricted to users that userId follows (+ self).
   *
   * @param {number} userId
   * @param {'all_time' | 'weekly' | 'monthly'} scope
   * @param {number} limit
   */
  static async getFriendsLeaderboard(userId, scope = 'all_time', limit = 50) {
    const col = XpModel._scopeColumn(scope);

    const result = await query(
      `SELECT
         ROW_NUMBER() OVER (ORDER BY ux.${col} DESC, ux.last_event_at ASC) AS rank,
         ux.user_id,
         u.username,
         u.avatar_url,
         ux.total_xp,
         ux.weekly_xp,
         ux.monthly_xp
       FROM user_xp ux
       JOIN users u ON u.id = ux.user_id
       WHERE ux.user_id = $1
          OR ux.user_id IN (
            SELECT following_id FROM user_follows
            WHERE follower_id = $1 AND status = 'accepted'
          )
       ORDER BY ux.${col} DESC, ux.last_event_at ASC
       LIMIT $2`,
      [userId, limit]
    );

    return result.rows;
  }

  /**
   * Return the requesting user's own rank within a given scope.
   */
  static async getUserRank(userId, scope = 'all_time') {
    const col = XpModel._scopeColumn(scope);

    // Global rank
    const globalResult = await query(
      `SELECT COUNT(*) + 1 AS rank
       FROM user_xp
       WHERE ${col} > COALESCE((SELECT ${col} FROM user_xp WHERE user_id = $1), 0)`,
      [userId]
    );

    // Friends rank
    const friendsResult = await query(
      `SELECT COUNT(*) + 1 AS rank
       FROM user_xp
       WHERE (user_id = $1 OR user_id IN (
         SELECT following_id FROM user_follows
         WHERE follower_id = $1 AND status = 'accepted'
       ))
       AND ${col} > COALESCE((SELECT ${col} FROM user_xp WHERE user_id = $1), 0)`,
      [userId]
    );

    // Own totals
    const totalsResult = await query(
      'SELECT total_xp, weekly_xp, monthly_xp FROM user_xp WHERE user_id = $1',
      [userId]
    );

    const totals = totalsResult.rows[0] || { total_xp: 0, weekly_xp: 0, monthly_xp: 0 };

    return {
      globalRank: parseInt(globalResult.rows[0].rank, 10),
      friendsRank: parseInt(friendsResult.rows[0].rank, 10),
      totalXp: totals.total_xp,
      weeklyXp: totals.weekly_xp,
      monthlyXp: totals.monthly_xp,
    };
  }

  // ──────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────

  static _scopeColumn(scope) {
    switch (scope) {
      case 'weekly':  return 'weekly_xp';
      case 'monthly': return 'monthly_xp';
      default:        return 'total_xp';
    }
  }

  static _tierMultiplier(tier) {
    switch (tier) {
      case 'plus':  return 1.1;
      case 'super': return 1.25;
      default:      return 1.0;
    }
  }
}

module.exports = XpModel;
