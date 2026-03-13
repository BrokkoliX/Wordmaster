-- Migration: Create the user_follows table
-- Run this against the wordmaster database before using the follow feature.

CREATE TABLE IF NOT EXISTS user_follows (
  id            SERIAL PRIMARY KEY,
  follower_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at   TIMESTAMPTZ,

  -- A user can only have one relationship row per target user.
  CONSTRAINT uq_follower_following UNIQUE (follower_id, following_id),

  -- Prevent self-follows at the DB level.
  CONSTRAINT chk_no_self_follow CHECK (follower_id <> following_id)
);

-- Speed up "get my followers" and "get my following" queries.
CREATE INDEX IF NOT EXISTS idx_follows_follower  ON user_follows (follower_id, status);
CREATE INDEX IF NOT EXISTS idx_follows_following ON user_follows (following_id, status);
