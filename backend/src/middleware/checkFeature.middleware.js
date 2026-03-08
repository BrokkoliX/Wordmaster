const SubscriptionModel = require('../models/subscription.model');

/**
 * checkFeature(featureKey)
 *
 * Middleware factory that gates a route behind a subscription feature.
 * Must be used AFTER the authenticate middleware so that req.user is populated.
 *
 * For boolean features: passes if the value is true for the user's tier.
 * For number features:  passes if the value is 0 (unlimited) or greater than 0.
 *                       Actual usage counting against the limit is the
 *                       responsibility of the route handler.
 *
 * Usage:
 *   router.get('/advanced', authenticate, checkFeature('advanced_stats'), handler);
 */
const checkFeature = (featureKey) => async (req, res, next) => {
  try {
    const tier = req.user?.subscription_tier || 'free';
    const features = await SubscriptionModel.getFeaturesForTier(tier);

    if (!features) {
      return res.status(403).json({
        error: {
          message: 'Subscription plan not found',
          code: 'PLAN_NOT_FOUND',
        },
      });
    }

    const value = features[featureKey];

    // Key is not defined in this plan's feature map — deny by default.
    if (value === undefined || value === null) {
      return res.status(403).json({
        error: {
          message: 'Your subscription plan does not include this feature',
          code: 'FEATURE_NOT_AVAILABLE',
          feature: featureKey,
          tier,
        },
      });
    }

    // Boolean gate.
    if (typeof value === 'boolean') {
      if (!value) {
        return res.status(403).json({
          error: {
            message: 'Your subscription plan does not include this feature',
            code: 'FEATURE_NOT_AVAILABLE',
            feature: featureKey,
            tier,
          },
        });
      }
      return next();
    }

    // Number gate: 0 means unlimited; any positive number means the feature
    // is available (limit enforcement belongs in the route handler).
    if (typeof value === 'number') {
      if (value < 0) {
        return res.status(403).json({
          error: {
            message: 'Your subscription plan does not include this feature',
            code: 'FEATURE_NOT_AVAILABLE',
            feature: featureKey,
            tier,
          },
        });
      }
      // Attach the limit to req so route handlers can enforce it if needed.
      req.featureLimits = req.featureLimits || {};
      req.featureLimits[featureKey] = value;
      return next();
    }

    // Unexpected value type — deny to be safe.
    return res.status(403).json({
      error: {
        message: 'Feature configuration error',
        code: 'FEATURE_CONFIG_ERROR',
      },
    });
  } catch (error) {
    console.error('checkFeature middleware error:', error);
    return res.status(500).json({
      error: {
        message: 'Failed to verify feature access',
        code: 'FEATURE_CHECK_FAILED',
      },
    });
  }
};

module.exports = { checkFeature };
