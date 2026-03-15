const HeartsModel = require('../models/hearts.model');
const serverConfig = require('../config/serverConfig');

// ─── GET /api/hearts ──────────────────────────────────────────────────────────
// Returns the user's current heart count after applying any accrued refills.
// Plus/Super users receive { hearts_enabled: false } and skip the hearts UI.

exports.getHearts = async (req, res) => {
  try {
    const tier = req.user.subscription_tier || 'free';

    // Paid tiers bypass hearts entirely.
    if (tier !== 'free') {
      return res.json({
        hearts_enabled: false,
      });
    }

    // Check onboarding grace period.
    const inGrace = await HeartsModel.isInGracePeriod(req.user.id);
    if (inGrace) {
      return res.json({
        hearts_enabled: false,
        grace_period: true,
      });
    }

    const hearts = await HeartsModel.getHeartsWithRefill(req.user.id);
    const dailyAdCap = serverConfig.get('hearts.daily_ad_cap', 3);
    const adsUsedToday = await HeartsModel.countTodayAdEvents(req.user.id, 'heart_refill');

    res.json({
      hearts_enabled: true,
      current_hearts: hearts.current_hearts,
      hearts_max: hearts.hearts_max,
      next_refill_at: hearts.next_refill_at,
      daily_ad_cap: dailyAdCap,
      ads_used_today: adsUsedToday,
      ads_remaining: Math.max(0, dailyAdCap - adsUsedToday),
    });
  } catch (error) {
    console.error('Get hearts error:', error);
    res.status(500).json({
      error: { message: 'Failed to fetch hearts', code: 'HEARTS_FETCH_FAILED' },
    });
  }
};

// ─── POST /api/hearts/use ─────────────────────────────────────────────────────
// Deducts one heart after an incorrect answer.
// Returns the updated count and whether hearts are now depleted.

exports.useHeart = async (req, res) => {
  try {
    const tier = req.user.subscription_tier || 'free';

    // Paid tiers don't consume hearts.
    if (tier !== 'free') {
      return res.json({
        hearts_enabled: false,
      });
    }

    // Grace period: no heart deduction.
    const inGrace = await HeartsModel.isInGracePeriod(req.user.id);
    if (inGrace) {
      return res.json({
        hearts_enabled: false,
        grace_period: true,
      });
    }

    const result = await HeartsModel.useHeart(req.user.id);

    res.json({
      hearts_enabled: true,
      current_hearts: result.current_hearts,
      hearts_depleted: result.hearts_depleted,
    });
  } catch (error) {
    console.error('Use heart error:', error);
    res.status(500).json({
      error: { message: 'Failed to use heart', code: 'HEART_USE_FAILED' },
    });
  }
};

// ─── POST /api/hearts/ad-refill ───────────────────────────────────────────────
// Grants hearts after a rewarded video. Validates daily ad cap.

exports.adRefill = async (req, res) => {
  try {
    const tier = req.user.subscription_tier || 'free';

    if (tier !== 'free') {
      return res.status(400).json({
        error: { message: 'Paid tiers do not use hearts', code: 'NOT_APPLICABLE' },
      });
    }

    // Enforce daily cap.
    const dailyAdCap = serverConfig.get('hearts.daily_ad_cap', 3);
    const adsUsedToday = await HeartsModel.countTodayAdEvents(req.user.id, 'heart_refill');

    if (adsUsedToday >= dailyAdCap) {
      return res.status(429).json({
        error: {
          message: 'Daily ad refill limit reached',
          code: 'AD_CAP_REACHED',
          ads_used_today: adsUsedToday,
          daily_ad_cap: dailyAdCap,
        },
      });
    }

    const result = await HeartsModel.adRefill(req.user.id);

    res.json({
      hearts_enabled: true,
      current_hearts: result.current_hearts,
      hearts_max: result.hearts_max,
      ads_used_today: adsUsedToday + 1,
      ads_remaining: Math.max(0, dailyAdCap - adsUsedToday - 1),
    });
  } catch (error) {
    console.error('Ad refill error:', error);
    res.status(500).json({
      error: { message: 'Failed to process ad refill', code: 'AD_REFILL_FAILED' },
    });
  }
};
