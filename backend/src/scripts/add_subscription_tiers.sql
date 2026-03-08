-- Migration: Subscription tiers system
-- Creates subscription_plans, user_subscriptions tables and
-- adds subscription_tier to users. Seeds the three default plans.

-- ─── 1. subscription_plans ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id          VARCHAR(20) PRIMARY KEY,          -- 'free' | 'plus' | 'super'
  name        VARCHAR(50)  NOT NULL,
  description TEXT,
  features    JSONB        NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  subscription_plans          IS 'One row per subscription tier. features is edited by admins at runtime.';
COMMENT ON COLUMN subscription_plans.features IS 'JSONB map of feature keys to boolean or integer values.';

-- ─── 2. user_subscriptions ────────────────────────────────────────────────────
-- user_id is UUID to match users.id (uuid primary key)
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id          SERIAL       PRIMARY KEY,
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id     VARCHAR(20)  NOT NULL REFERENCES subscription_plans(id),
  status      VARCHAR(20)  NOT NULL DEFAULT 'active',   -- active | expired | cancelled
  started_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,                              -- NULL = no expiry (free tier)
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT check_subscription_status CHECK (status IN ('active', 'expired', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status  ON user_subscriptions(status);

COMMENT ON TABLE user_subscriptions IS 'Links a user to their active subscription plan.';

-- ─── 3. Add denormalized tier column to users ─────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) NOT NULL DEFAULT 'free';

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS check_subscription_tier;

ALTER TABLE users
  ADD CONSTRAINT check_subscription_tier
  CHECK (subscription_tier IN ('free', 'plus', 'super'));

CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);

COMMENT ON COLUMN users.subscription_tier IS 'Denormalized cache of the active plan id. Kept in sync with user_subscriptions.';

-- ─── 4. Seed the three default plans ─────────────────────────────────────────
INSERT INTO subscription_plans (id, name, description, features) VALUES
(
  'free',
  'Free',
  'Basic access to WordMaster. Great for getting started.',
  '{
    "offline_mode":      false,
    "advanced_stats":    false,
    "custom_word_lists": false,
    "priority_support":  false,
    "daily_word_limit":  20,
    "language_pairs":    1
  }'::jsonb
),
(
  'plus',
  'Plus',
  'Enhanced learning with offline access and advanced statistics.',
  '{
    "offline_mode":      true,
    "advanced_stats":    true,
    "custom_word_lists": false,
    "priority_support":  false,
    "daily_word_limit":  100,
    "language_pairs":    3
  }'::jsonb
),
(
  'super',
  'Super',
  'Full access to every WordMaster feature with priority support.',
  '{
    "offline_mode":      true,
    "advanced_stats":    true,
    "custom_word_lists": true,
    "priority_support":  true,
    "daily_word_limit":  0,
    "language_pairs":    0
  }'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ─── 5. Backfill: give every existing user a free subscription row ────────────
INSERT INTO user_subscriptions (user_id, plan_id, status)
  SELECT id, 'free', 'active'
  FROM   users
  WHERE  id NOT IN (SELECT user_id FROM user_subscriptions)
ON CONFLICT DO NOTHING;
