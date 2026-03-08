const SubscriptionModel = require('../models/subscription.model');
const { KNOWN_FEATURE_KEYS } = require('../config/featureKeys');

// ─── User-facing ──────────────────────────────────────────────────────────────

/**
 * GET /api/subscriptions/me
 * Returns the calling user's active plan and public feature map.
 */
exports.getMySubscription = async (req, res) => {
  try {
    const tier = req.user.subscription_tier || 'free';
    const features = await SubscriptionModel.getFeaturesForTier(tier);

    if (!features) {
      return res.status(404).json({
        error: { message: 'Subscription plan not found', code: 'PLAN_NOT_FOUND' },
      });
    }

    // Only expose keys marked public: true in KNOWN_FEATURE_KEYS.
    const publicFeatures = {};
    for (const [key, meta] of Object.entries(KNOWN_FEATURE_KEYS)) {
      if (meta.public && features[key] !== undefined) {
        publicFeatures[key] = features[key];
      }
    }

    res.json({
      subscription: {
        tier,
        features: publicFeatures,
      },
    });
  } catch (error) {
    console.error('Get my subscription error:', error);
    res.status(500).json({
      error: { message: 'Failed to fetch subscription', code: 'FETCH_FAILED' },
    });
  }
};

// ─── Admin-facing ─────────────────────────────────────────────────────────────

/**
 * GET /api/admin/subscription-plans
 * Lists all three plan definitions.
 */
exports.getSubscriptionPlans = async (req, res) => {
  try {
    const plans = await SubscriptionModel.getAllPlans();
    res.json({ plans });
  } catch (error) {
    console.error('Get subscription plans error:', error);
    res.status(500).json({
      error: { message: 'Failed to fetch subscription plans' },
    });
  }
};

/**
 * GET /api/admin/subscription-plans/:id
 * Returns a single plan definition.
 */
exports.getSubscriptionPlanById = async (req, res) => {
  try {
    const plan = await SubscriptionModel.getPlanById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        error: { message: 'Subscription plan not found' },
      });
    }

    res.json({ plan });
  } catch (error) {
    console.error('Get subscription plan by id error:', error);
    res.status(500).json({
      error: { message: 'Failed to fetch subscription plan' },
    });
  }
};

/**
 * PUT /api/admin/subscription-plans/:id
 * Updates a plan's features (and optionally name/description).
 * Validates all feature keys against KNOWN_FEATURE_KEYS and their expected types.
 */
exports.updateSubscriptionPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { features, name, description } = req.body;

    // Validate incoming features against the allowlist.
    if (features !== undefined) {
      if (typeof features !== 'object' || Array.isArray(features)) {
        return res.status(400).json({
          error: { message: 'features must be a JSON object' },
        });
      }

      const validationErrors = [];

      for (const [key, value] of Object.entries(features)) {
        const meta = KNOWN_FEATURE_KEYS[key];

        if (!meta) {
          validationErrors.push(`Unknown feature key: "${key}". Add it to src/config/featureKeys.js first.`);
          continue;
        }

        const actualType = typeof value;
        if (meta.type === 'boolean' && actualType !== 'boolean') {
          validationErrors.push(`Feature "${key}" must be a boolean, got ${actualType}.`);
        }
        if (meta.type === 'number' && actualType !== 'number') {
          validationErrors.push(`Feature "${key}" must be a number, got ${actualType}.`);
        }
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: { message: 'Feature validation failed', details: validationErrors },
        });
      }
    }

    const updated = await SubscriptionModel.updatePlan(id, { features, name, description });

    if (!updated) {
      return res.status(404).json({
        error: { message: 'Subscription plan not found' },
      });
    }

    res.json({
      message: 'Subscription plan updated successfully',
      plan: updated,
    });
  } catch (error) {
    console.error('Update subscription plan error:', error);
    res.status(500).json({
      error: { message: 'Failed to update subscription plan' },
    });
  }
};

/**
 * GET /api/admin/subscription-plans/feature-keys
 * Returns the KNOWN_FEATURE_KEYS allowlist so the admin UI can render
 * form controls dynamically without hardcoding key names.
 */
exports.getFeatureKeys = async (req, res) => {
  try {
    res.json({ featureKeys: KNOWN_FEATURE_KEYS });
  } catch (error) {
    console.error('Get feature keys error:', error);
    res.status(500).json({
      error: { message: 'Failed to fetch feature keys' },
    });
  }
};
