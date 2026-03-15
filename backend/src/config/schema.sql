-- WordMaster Database Schema
-- PostgreSQL 12+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Words table (central vocabulary store for all language pairs and levels)
CREATE TABLE IF NOT EXISTS words (
  id VARCHAR(100) PRIMARY KEY,
  word TEXT NOT NULL,
  translation TEXT NOT NULL,
  difficulty INTEGER DEFAULT 1,
  category VARCHAR(100),
  frequency_rank INTEGER,
  cefr_level VARCHAR(10) NOT NULL,
  source_lang VARCHAR(10) NOT NULL,
  target_lang VARCHAR(10) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_words_lang_pair
  ON words(source_lang, target_lang);
CREATE INDEX IF NOT EXISTS idx_words_lang_level
  ON words(source_lang, target_lang, cefr_level);
CREATE INDEX IF NOT EXISTS idx_words_frequency
  ON words(source_lang, target_lang, frequency_rank);

-- Sentence templates for fill-in-the-blank grammar exercises
CREATE TABLE IF NOT EXISTS sentence_templates (
  id VARCHAR(100) PRIMARY KEY,
  language VARCHAR(10) NOT NULL,          -- target language: 'es','fr','de','hu'
  cefr_level VARCHAR(10) NOT NULL,        -- 'A1','A2','B1', etc.
  sentence TEXT NOT NULL,                 -- "Ich ___ Student." (blank = ___)
  answer TEXT NOT NULL,                   -- "bin"
  answer_word_id VARCHAR(100),            -- FK to words.id (nullable)
  distractors TEXT,                       -- JSON array: '["bist","ist","sind"]'
  hint TEXT,                              -- "to be, first person singular"
  grammar_topic VARCHAR(100),             -- 'present_tense','articles','cases', etc.
  difficulty INTEGER DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_sentences_lang
  ON sentence_templates(language);
CREATE INDEX IF NOT EXISTS idx_sentences_lang_level
  ON sentence_templates(language, cefr_level);
CREATE INDEX IF NOT EXISTS idx_sentences_topic
  ON sentence_templates(language, grammar_topic);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(50) UNIQUE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  cefr_level VARCHAR(10) DEFAULT 'A1',
  known_language VARCHAR(10) DEFAULT 'en',
  learning_language VARCHAR(10) DEFAULT 'es',
  tts_enabled BOOLEAN DEFAULT TRUE,
  tts_rate DECIMAL(3,2) DEFAULT 0.75,
  daily_goal INTEGER DEFAULT 20,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  theme VARCHAR(20) DEFAULT 'light',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User word progress table
CREATE TABLE IF NOT EXISTS user_word_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  word_id VARCHAR(100) NOT NULL,
  status VARCHAR(50),
  confidence_level INTEGER,
  consecutive_correct INTEGER DEFAULT 0,
  ease_factor DECIMAL(3,2) DEFAULT 2.5,
  interval_days INTEGER DEFAULT 0,
  next_review_date DATE,
  times_shown INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  times_incorrect INTEGER DEFAULT 0,
  last_reviewed TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, word_id)
);

-- Learning sessions table
CREATE TABLE IF NOT EXISTS learning_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP,
  words_reviewed INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  accuracy DECIMAL(5,2),
  session_data JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Achievement definitions table (master list managed by admin)
CREATE TABLE IF NOT EXISTS achievement_definitions (
  id VARCHAR(100) PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(20) NOT NULL DEFAULT '🏆',
  rarity VARCHAR(20) NOT NULL DEFAULT 'common'
    CHECK(rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  points INTEGER NOT NULL DEFAULT 0,
  unlock_criteria JSONB NOT NULL DEFAULT '{}',
  hidden BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_achievement_defs_category
  ON achievement_definitions(category);
CREATE INDEX IF NOT EXISTS idx_achievement_defs_rarity
  ON achievement_definitions(rarity);

-- User achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_id VARCHAR(100) NOT NULL,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  progress INTEGER DEFAULT 0,
  UNIQUE(user_id, achievement_id)
);

-- Password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_word_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_next_review ON user_word_progress(user_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Streak and session-stats queries order by start_time DESC per user
CREATE INDEX IF NOT EXISTS idx_sessions_user_start ON learning_sessions(user_id, start_time DESC);

-- Words due for review: the most frequent query pattern in the learning flow
CREATE INDEX IF NOT EXISTS idx_progress_due ON user_word_progress(user_id, next_review_date)
  WHERE next_review_date IS NOT NULL;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Hearts system (monetization)
CREATE TABLE IF NOT EXISTS user_hearts (
  user_id        UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_hearts INTEGER     NOT NULL DEFAULT 5,
  last_refill_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_ad_events (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type  VARCHAR(50) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_events_user_date
  ON user_ad_events(user_id, created_at);

-- Idempotent trigger creation: each trigger is only created when absent
-- so that re-running this file against an existing database is safe.
DO $$
DECLARE
  _tbl  TEXT;
  _trig TEXT;
BEGIN
  -- (table_name, trigger_name) pairs
  FOR _tbl, _trig IN
    VALUES ('users',              'update_users_updated_at'),
           ('user_settings',      'update_user_settings_updated_at'),
           ('user_word_progress', 'update_user_word_progress_updated_at'),
           ('user_hearts',        'update_user_hearts_updated_at')
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger WHERE tgname = _trig
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE ON %I '
        'FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        _trig, _tbl
      );
    END IF;
  END LOOP;
END
$$;
