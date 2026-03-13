-- XP & Leaderboard System Migration
-- Creates xp_rules, xp_events, user_xp tables with indexes and seed data.

BEGIN;

-- ───────────────────────────────────────────────────────────
-- 1. Scoring configuration table
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS xp_rules (
  event_type      TEXT PRIMARY KEY,
  base_xp         INTEGER NOT NULL DEFAULT 0,
  is_repeatable   BOOLEAN NOT NULL DEFAULT TRUE,
  daily_cap       INTEGER,
  total_cap       INTEGER,
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────
-- 2. Immutable event ledger
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS xp_events (
  id              BIGSERIAL PRIMARY KEY,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL REFERENCES xp_rules(event_type),
  reference_id    TEXT,
  base_xp         INTEGER NOT NULL,
  multiplier      REAL NOT NULL DEFAULT 1.0,
  awarded_xp      INTEGER NOT NULL,
  occurred_at     TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user_id    ON xp_events(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_event_type ON xp_events(event_type);
CREATE INDEX IF NOT EXISTS idx_xp_events_occurred   ON xp_events(occurred_at);

-- Prevents duplicate syncs for one-time events
CREATE UNIQUE INDEX IF NOT EXISTS idx_xp_events_user_ref
  ON xp_events(user_id, event_type, reference_id)
  WHERE reference_id IS NOT NULL;

-- ───────────────────────────────────────────────────────────
-- 3. Materialised totals for fast leaderboard reads
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_xp (
  user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_xp        INTEGER NOT NULL DEFAULT 0,
  weekly_xp       INTEGER NOT NULL DEFAULT 0,
  monthly_xp      INTEGER NOT NULL DEFAULT 0,
  last_event_at   TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_xp_total   ON user_xp(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_weekly  ON user_xp(weekly_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_monthly ON user_xp(monthly_xp DESC);

-- ───────────────────────────────────────────────────────────
-- 4. Reset audit log (for weekly/monthly resets)
-- ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS xp_reset_log (
  id              BIGSERIAL PRIMARY KEY,
  reset_scope     TEXT NOT NULL,
  rows_affected   INTEGER NOT NULL DEFAULT 0,
  executed_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────────────────
-- 5. Seed xp_rules
-- ───────────────────────────────────────────────────────────
INSERT INTO xp_rules (event_type, base_xp, is_repeatable, daily_cap, total_cap, description)
VALUES
  ('session_completed',          10, TRUE,  NULL, NULL, 'Any session finished'),
  ('word_mastered',               5, TRUE,  NULL, NULL, 'Word status changed to mastered (one-time per word via reference_id)'),
  ('perfect_session',            25, TRUE,  NULL, NULL, '100% accuracy with 20+ words'),
  ('daily_streak_maintained',     5, TRUE,     1, NULL, 'Streak incremented (once per day)'),
  ('streak_milestone_7',         50, FALSE, NULL,    1, 'Streak hit 7 days'),
  ('streak_milestone_30',       200, FALSE, NULL,    1, 'Streak hit 30 days'),
  ('streak_milestone_100',      500, FALSE, NULL,    1, 'Streak hit 100 days'),
  ('streak_milestone_365',     2000, FALSE, NULL,    1, 'Streak hit 365 days'),
  ('achievement_unlocked',       0,  TRUE,  NULL, NULL, 'Any achievement fires — base_xp comes from achievement points'),
  ('daily_challenge_completed',  30, TRUE,     1, NULL, 'Daily challenge finished (once per day)'),
  ('words_reviewed',              1, TRUE,    50, NULL, 'Per word shown in session, capped at 50/day'),
  ('cefr_level_advanced',      100, FALSE, NULL, NULL, 'User advances CEFR level (one-time per level via reference_id)'),
  ('language_added',             50, FALSE, NULL, NULL, 'New language pair started (one-time per pair via reference_id)')
ON CONFLICT (event_type) DO NOTHING;

COMMIT;
