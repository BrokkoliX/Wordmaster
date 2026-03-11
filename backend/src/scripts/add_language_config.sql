-- Migration: Language & feature-toggle configuration
-- Creates the language_config table used by the admin UI to control
-- which languages, language pairs, and per-pair learning features are
-- enabled in the mobile app.
--
-- Run once against the production database:
--   psql $DATABASE_URL -f add_language_config.sql

CREATE TABLE IF NOT EXISTS language_config (
  -- For a language entry  : id = ISO 639-1 code, e.g. 'en'
  -- For a pair entry      : id = 'source-target', e.g. 'en-fr'
  id          VARCHAR(20)  PRIMARY KEY,
  type        VARCHAR(10)  NOT NULL CHECK (type IN ('language', 'pair')),
  enabled     BOOLEAN      NOT NULL DEFAULT false,
  -- JSONB feature flags for pair entries (ignored for language entries).
  -- Known keys: multiple_choice, matching_pairs, type_translation,
  --             fill_in_blank, smart_review
  -- Values: true | false
  features    JSONB        NOT NULL DEFAULT '{}',
  notes       TEXT,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_by  VARCHAR(255)
);

COMMENT ON TABLE  language_config          IS 'Admin-controlled toggle layer for languages, pairs, and per-pair learning features.';
COMMENT ON COLUMN language_config.features IS 'Keyed by learning mode slug. Only meaningful for type=pair rows.';

CREATE INDEX IF NOT EXISTS idx_language_config_type
  ON language_config (type);

CREATE INDEX IF NOT EXISTS idx_language_config_enabled
  ON language_config (type, enabled);

-- Function to keep updated_at current
CREATE OR REPLACE FUNCTION touch_language_config()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_language_config_updated_at ON language_config;
CREATE TRIGGER trg_language_config_updated_at
  BEFORE UPDATE ON language_config
  FOR EACH ROW EXECUTE FUNCTION touch_language_config();
