const XpModel = require('../models/xp.model');

/**
 * Leaderboard Controller
 *
 * HTTP handlers for the leaderboard API. Subscription tier gating
 * is enforced inline: weekly/monthly scopes require 'plus' or 'super'.
 */

const VALID_SCOPES = ['all_time', 'weekly', 'monthly'];
const TIER_REQUIRED_SCOPES = ['weekly', 'monthly'];

/**
 * GET /api/leaderboard/global
 */
exports.getGlobal = async (req, res) => {
  try {
    const scope = VALID_SCOPES.includes(req.query.scope) ? req.query.scope : 'all_time';

    if (TIER_REQUIRED_SCOPES.includes(scope) && req.user.subscription_tier === 'free') {
      return res.status(403).json({
        error: {
          message: `${scope} leaderboard requires a Plus or Super subscription`,
          code: 'TIER_REQUIRED',
        },
      });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, _maxLimit(req.user.subscription_tier));
    const offset = parseInt(req.query.offset, 10) || 0;

    const rows = await XpModel.getGlobalLeaderboard(scope, limit, offset);

    res.json({ leaderboard: rows });
  } catch (error) {
    console.error('Global leaderboard error:', error);
    res.status(500).json({
      error: { message: 'Failed to load leaderboard', code: 'LEADERBOARD_FAILED' },
    });
  }
};

/**
 * GET /api/leaderboard/friends
 */
exports.getFriends = async (req, res) => {
  try {
    const scope = VALID_SCOPES.includes(req.query.scope) ? req.query.scope : 'all_time';

    if (TIER_REQUIRED_SCOPES.includes(scope) && req.user.subscription_tier === 'free') {
      return res.status(403).json({
        error: {
          message: `${scope} leaderboard requires a Plus or Super subscription`,
          code: 'TIER_REQUIRED',
        },
      });
    }

    const rows = await XpModel.getFriendsLeaderboard(req.user.id, scope);

    res.json({ leaderboard: rows });
  } catch (error) {
    console.error('Friends leaderboard error:', error);
    res.status(500).json({
      error: { message: 'Failed to load friends leaderboard', code: 'LEADERBOARD_FAILED' },
    });
  }
};

/**
 * GET /api/leaderboard/me
 */
exports.getMe = async (req, res) => {
  try {
    const scope = VALID_SCOPES.includes(req.query.scope) ? req.query.scope : 'all_time';

    const rank = await XpModel.getUserRank(req.user.id, scope);

    res.json(rank);
  } catch (error) {
    console.error('Get my rank error:', error);
    res.status(500).json({
      error: { message: 'Failed to get rank', code: 'RANK_FAILED' },
    });
  }
};

// ────────────── helpers ──────────────

function _maxLimit(tier) {
  if (tier === 'super') return 500;
  return 50;
}
