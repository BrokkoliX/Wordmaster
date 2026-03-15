-- Migration: Hearts system for monetization
-- Creates user_hearts and user_ad_events tables for server-side
-- heart state tracking and ad event logging.

-- ─── 1. user_hearts ──────────────────────────────────────────────────────────
-- One row per user. Tracks the authoritative heart count and the last time
-- a natural refill was applied. Plus/Super users bypass this entirely.
CREATE TABLE IF NOT EXISTS user_hearts (
  user_id        UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_hearts INTEGER     NOT NULL DEFAULT 5,
  last_refill_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  user_hearts                IS 'Server-authoritative heart state per user.';
COMMENT ON COLUMN user_hearts.current_hearts IS 'Current heart count. Clamped to 0..hearts_max.';
COMMENT ON COLUMN user_hearts.last_refill_at IS 'Timestamp of the last natural or ad-based refill. Used to compute accrued passive refills.';

-- ─── 2. user_ad_events ──────────────────────────────────────────────────────
-- Append-only log of rewarded-ad interactions. Used to enforce daily caps
-- and for monetization analytics.
CREATE TABLE IF NOT EXISTS user_ad_events (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type  VARCHAR(50) NOT NULL,  -- 'heart_refill' | 'bonus_practice' | 'streak_save'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_events_user_date
  ON user_ad_events(user_id, created_at);

COMMENT ON TABLE  user_ad_events            IS 'Append-only log of rewarded ad events per user.';
COMMENT ON COLUMN user_ad_events.event_type IS 'Type of reward: heart_refill, bonus_practice, streak_save.';

-- ─── 3. Backfill: give every existing user a hearts row ──────────────────────
INSERT INTO user_hearts (user_id, current_hearts)
  SELECT id, 5
  FROM   users
  WHERE  id NOT IN (SELECT user_id FROM user_hearts)
ON CONFLICT DO NOTHING;

-- ─── 4. Update subscription_plans with heart-related feature values ──────────
-- Free: hearts enabled, 5 max, 20 min refill, +3 per ad, 3 ads/day cap
UPDATE subscription_plans
SET features = features
  || '{"hearts_enabled": true, "hearts_max": 5, "hearts_refill_minutes": 20, "hearts_ad_refill": 3, "daily_ad_cap": 3, "streak_save_enabled": false}'::jsonb
WHERE id = 'free';

-- Plus: hearts disabled (unlimited)
UPDATE subscription_plans
SET features = features
  || '{"hearts_enabled": false, "hearts_max": 0, "hearts_refill_minutes": 0, "hearts_ad_refill": 0, "daily_ad_cap": 0, "streak_save_enabled": true}'::jsonb
WHERE id = 'plus';

-- Super: hearts disabled (unlimited)
UPDATE subscription_plans
SET features = features
  || '{"hearts_enabled": false, "hearts_max": 0, "hearts_refill_minutes": 0, "hearts_ad_refill": 0, "daily_ad_cap": 0, "streak_save_enabled": true}'::jsonb
WHERE id = 'super';

-- ─── 5. Seed server_config rows for hearts tuning ───────────────────────────
-- These keys are read by hearts.model.js and hearts.controller.js via
-- serverConfig.get(). Without them the hardcoded defaults still work,
-- but they won't appear in the admin UI.
INSERT INTO server_config (key, value, type, label, category, notes) VALUES
  ('hearts.starting_count',
    '5',
    'number', 'Starting / Max Hearts', 'hearts',
    'Number of hearts a free user starts with and can hold at most.'),
  ('hearts.refill_interval_ms',
    '1200000',
    'number', 'Refill Interval (ms)', 'hearts',
    'Milliseconds between natural heart refills. 1200000 = 20 minutes.'),
  ('hearts.ad_refill_amount',
    '3',
    'number', 'Ad Refill Amount', 'hearts',
    'Hearts granted when the user watches a rewarded ad.'),
  ('hearts.daily_ad_cap',
    '3',
    'number', 'Daily Ad Cap', 'hearts',
    'Maximum rewarded-ad heart refills per user per day.'),
  ('hearts.grace_period_hours',
    '24',
    'number', 'Grace Period (hours)', 'hearts',
    'Hours after account creation during which hearts are not enforced.'),
  ('hearts.grace_period_sessions',
    '5',
    'number', 'Grace Period (sessions)', 'hearts',
    'Minimum completed sessions before hearts are enforced.')
ON CONFLICT (key) DO NOTHING;

-- ─── 6. Seed server_config row for the hearts rate limiter ──────────────────
INSERT INTO server_config (key, value, type, label, category, notes) VALUES
  ('rate_limit.hearts',
    '{"max": 60, "windowMs": 900000}',
    'json', 'Hearts', 'rate_limits',
    'Applies to /api/hearts. Per IP per window.')
ON CONFLICT (key) DO NOTHING;

-- ─── 7. Seed server_config rows for JWT token expiry ────────────────────────
-- These allow adjusting token lifetimes from the admin UI instead of
-- requiring a .env change and server restart.
INSERT INTO server_config (key, value, type, label, category, notes) VALUES
  ('jwt.access_expires_in',
    '"15m"',
    'string', 'Access Token Expiry', 'security',
    'JWT access token lifetime. Examples: "15m", "1h", "2h".'),
  ('jwt.refresh_expires_in',
    '"7d"',
    'string', 'Refresh Token Expiry', 'security',
    'JWT refresh token lifetime. Examples: "7d", "14d", "30d".')
ON CONFLICT (key) DO NOTHING;
