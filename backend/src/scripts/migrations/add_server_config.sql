-- Migration: Generic system settings store
-- Provides a runtime-editable key/value config table consumed by the
-- admin UI and the backend serverConfig singleton.
--
-- Run once:
--   psql $DATABASE_URL -f add_server_config.sql

CREATE TABLE IF NOT EXISTS server_config (
  key        VARCHAR(100) PRIMARY KEY,
  value      JSONB        NOT NULL,
  type       VARCHAR(20)  NOT NULL CHECK (type IN ('number', 'boolean', 'string', 'json')),
  label      VARCHAR(200) NOT NULL,
  category   VARCHAR(50)  NOT NULL,
  notes      TEXT,
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_by VARCHAR(255)
);

COMMENT ON TABLE  server_config       IS 'Runtime-editable system settings. Add new rows to expose new settings in the admin UI without code changes.';
COMMENT ON COLUMN server_config.key   IS 'Dot-namespaced identifier, e.g. rate_limit.admin';
COMMENT ON COLUMN server_config.value IS 'JSONB-encoded value. Scalars are stored as JSON primitives.';
COMMENT ON COLUMN server_config.type  IS 'Drives the admin UI input type and value validation.';

CREATE INDEX IF NOT EXISTS idx_server_config_category ON server_config (category);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION touch_server_config()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_server_config_updated_at ON server_config;
CREATE TRIGGER trg_server_config_updated_at
  BEFORE UPDATE ON server_config
  FOR EACH ROW EXECUTE FUNCTION touch_server_config();

-- ── Seed: rate limits ─────────────────────────────────────────────────────────
INSERT INTO server_config (key, value, type, label, category, notes) VALUES
  ('rate_limit.global',
    '{"max": 100, "windowMs": 900000}',
    'json', 'Global', 'rate_limits',
    'Applies to all routes. Per IP per window.'),
  ('rate_limit.auth',
    '{"max": 10, "windowMs": 900000}',
    'json', 'Auth', 'rate_limits',
    'Applies to /api/auth. Per IP per window.'),
  ('rate_limit.admin',
    '{"max": 200, "windowMs": 900000}',
    'json', 'Admin', 'rate_limits',
    'Applies to /api/admin. Per IP per window.'),
  ('rate_limit.subscription',
    '{"max": 60, "windowMs": 900000}',
    'json', 'Subscriptions', 'rate_limits',
    'Applies to /api/subscriptions. Per IP per window.')
ON CONFLICT (key) DO NOTHING;
