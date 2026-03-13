-- Remainder migration: runs only the parts that failed in the first pass
-- (user_subscriptions table + backfill).
-- Safe to re-run: uses IF NOT EXISTS and ON CONFLICT DO NOTHING.

BEGIN;

-- ─── user_subscriptions ───────────────────────────────────────────────────────
-- user_id is UUID to match users.id
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id          SERIAL       PRIMARY KEY,
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id     VARCHAR(20)  NOT NULL REFERENCES subscription_plans(id),
  status      VARCHAR(20)  NOT NULL DEFAULT 'active',
  started_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT check_subscription_status CHECK (status IN ('active', 'expired', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status  ON user_subscriptions(status);

COMMENT ON TABLE user_subscriptions IS 'Links a user to their active subscription plan.';

-- ─── Backfill: give every existing user a free subscription row ───────────────
INSERT INTO user_subscriptions (user_id, plan_id, status)
  SELECT id, 'free', 'active'
  FROM   users
  WHERE  id NOT IN (SELECT user_id FROM user_subscriptions)
ON CONFLICT DO NOTHING;

COMMIT;
