/**
 * KNOWN_FEATURE_KEYS
 *
 * Single source of truth for every valid subscription feature key.
 * - type    : 'boolean' | 'number'
 * - public  : true  → sent to the mobile client via GET /api/subscriptions/me
 *             false → server-side enforcement only, never exposed to clients
 *
 * To add a new feature gate:
 *   1. Add the key here.
 *   2. Seed the value into each plan row via the admin UI or a DB migration.
 *   3. Add checkFeature('your_key') to the relevant route.
 */
const KNOWN_FEATURE_KEYS = {
  offline_mode:           { type: 'boolean', public: true  },
  advanced_stats:         { type: 'boolean', public: true  },
  custom_word_lists:      { type: 'boolean', public: true  },
  priority_support:       { type: 'boolean', public: false },
  daily_word_limit:       { type: 'number',  public: true  },
  language_pairs:         { type: 'number',  public: true  },
  // Hearts / monetization
  hearts_enabled:         { type: 'boolean', public: true  },
  hearts_max:             { type: 'number',  public: true  },
  hearts_refill_minutes:  { type: 'number',  public: true  },
  hearts_ad_refill:       { type: 'number',  public: true  },
  daily_ad_cap:           { type: 'number',  public: true  },
  streak_save_enabled:    { type: 'boolean', public: true  },
};

module.exports = { KNOWN_FEATURE_KEYS };
