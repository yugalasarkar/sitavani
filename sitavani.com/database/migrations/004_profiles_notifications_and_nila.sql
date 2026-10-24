-- 004_profiles_notifications_and_nila.sql: Deep Profiles, Live Notifications & NILA Dakṣiṇā Tipping

-- 1. Extend Users for Profiles & NILA Tips
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS banner_url TEXT,
  ADD COLUMN IF NOT EXISTS total_nila_received NUMERIC(18, 4) DEFAULT 0;

-- 2. Notifications System
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  recipient_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  sender_address VARCHAR(42),
  type VARCHAR(30) NOT NULL, -- 'REPLY_POST', 'REPLY_COMMENT', 'ACCORD_MILESTONE', 'OFFICIAL_DISPATCH', 'WARNING_STRIKE', 'NILA_TIP'
  title TEXT NOT NULL,
  body TEXT,
  link VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_address, is_read, created_at DESC);

-- 3. Nīlā (नीला) Dakṣiṇā Tipping Ledger
CREATE TABLE IF NOT EXISTS nila_tips (
  id SERIAL PRIMARY KEY,
  sender_address VARCHAR(42) NOT NULL,
  recipient_address VARCHAR(42) NOT NULL,
  target_type VARCHAR(20) NOT NULL, -- 'POST', 'COMMENT'
  target_id VARCHAR(100) NOT NULL,
  amount_nila NUMERIC(18, 4) NOT NULL,
  chain_tx_hash VARCHAR(66) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_nila_tips_target ON nila_tips(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_nila_tips_recipient ON nila_tips(recipient_address);

-- 4. User Saved Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  user_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  post_id VARCHAR(100) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_address, post_id)
);
