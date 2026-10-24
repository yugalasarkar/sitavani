-- 003_moderation_and_warnings.sql: 8-Warning Progressive Enforcement & Moderation Schema

-- 1. Extend Users with Warning & Ban Controls
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS warnings_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ban_reason TEXT,
  ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS banned_by VARCHAR(42);

-- 2. Extend Posts & Comments with Deletion & Warning Controls
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_reason TEXT,
  ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(42),
  ADD COLUMN IF NOT EXISTS is_misinformation BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_warning_note TEXT;

ALTER TABLE comments
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS deleted_reason TEXT,
  ADD COLUMN IF NOT EXISTS deleted_by VARCHAR(42);

-- 3. User Warnings Log Table (Tracks each progressive strike 1..8)
CREATE TABLE IF NOT EXISTS user_warnings (
  id SERIAL PRIMARY KEY,
  user_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  warned_by VARCHAR(42) NOT NULL,
  reason TEXT NOT NULL,
  target_type VARCHAR(20) DEFAULT 'POST', -- 'POST', 'COMMENT', 'DIRECT'
  target_id VARCHAR(100),
  warning_index INT NOT NULL, -- 1 through 8
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. General Moderation Logs Table
CREATE TABLE IF NOT EXISTS moderation_logs (
  id SERIAL PRIMARY KEY,
  admin_address VARCHAR(42) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(100),
  target_address VARCHAR(42),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
