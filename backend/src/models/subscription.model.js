const { query } = require('../config/database');

// ─── In-process plan cache ────────────────────────────────────────────────────
// Maps plan id → features object. TTL: 60 seconds.
// See Known Limitations in docs/SUBSCRIPTION_TIERS_PLAN.md for multi-process
// behaviour and the Redis upgrade path.
const CACHE_TTL_MS = 60 * 1000;
let planCache = null;       // { [planId]: { ...features } }
let cacheExpiresAt = 0;

class SubscriptionModel {
  /**
   * Return the full feature map for every plan, using the in-process cache.
   * @returns {Promise<Object>} e.g. { free: { offline_mode: false, ... }, ... }
   */
  static async getAllPlanFeatures() {
    if (planCache && Date.now() < cacheExpiresAt) {
      return planCache;
    }

    const result = await query(
      'SELECT id, features FROM subscription_plans ORDER BY id'
    );

    const map = {};
    for (const row of result.rows) {
      map[row.id] = row.features;
    }

    planCache = map;
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    return map;
  }

  /**
   * Return the features object for a single plan tier.
   * @param {string} tier - 'free' | 'plus' | 'super'
   * @returns {Promise<Object|null>}
   */
  static async getFeaturesForTier(tier) {
    const all = await SubscriptionModel.getAllPlanFeatures();
    return all[tier] || null;
  }

  /**
   * Invalidate the in-process plan cache.
   * Called after an admin updates a plan so the next request fetches fresh data.
   */
  static invalidateCache() {
    planCache = null;
    cacheExpiresAt = 0;
  }

  /**
   * Return all plan rows with their full details for the admin UI.
   * @returns {Promise<Array>}
   */
  static async getAllPlans() {
    const result = await query(
      'SELECT id, name, description, features, created_at, updated_at FROM subscription_plans ORDER BY id'
    );
    return result.rows;
  }

  /**
   * Return a single plan row by id.
   * @param {string} id
   * @returns {Promise<Object|null>}
   */
  static async getPlanById(id) {
    const result = await query(
      'SELECT id, name, description, features, created_at, updated_at FROM subscription_plans WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Update a plan's features and optional metadata.
   * Invalidates the in-process cache on success.
   * @param {string} id
   * @param {Object} updates - { features?, name?, description? }
   * @returns {Promise<Object>} updated plan row
   */
  static async updatePlan(id, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramCount}`);
      values.push(updates.name);
      paramCount++;
    }

    if (updates.description !== undefined) {
      fields.push(`description = $${paramCount}`);
      values.push(updates.description);
      paramCount++;
    }

    if (updates.features !== undefined) {
      fields.push(`features = $${paramCount}::jsonb`);
      values.push(JSON.stringify(updates.features));
      paramCount++;
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    fields.push('updated_at = NOW()');
    values.push(id);

    const result = await query(
      `UPDATE subscription_plans
       SET ${fields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, name, description, features, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    SubscriptionModel.invalidateCache();
    return result.rows[0];
  }

  /**
   * Return the active subscription row for a user, or null if none found.
   * @param {number} userId
   * @returns {Promise<Object|null>}
   */
  static async getActiveSubscription(userId) {
    const result = await query(
      `SELECT us.*, sp.name as plan_name, sp.features
       FROM user_subscriptions us
       JOIN subscription_plans sp ON us.plan_id = sp.id
       WHERE us.user_id = $1
         AND us.status = 'active'
         AND (us.expires_at IS NULL OR us.expires_at > NOW())
       ORDER BY us.created_at DESC
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  }
}

module.exports = SubscriptionModel;
