-- 005_sub_sabhas_and_polls.sql
-- Track creator of Sub-Sitavanis (Upa-Sabha) and allow community referendum / poll voting

ALTER TABLE sabhas ADD COLUMN IF NOT EXISTS creator_address VARCHAR(42) REFERENCES users(wallet_address) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS poll_votes (
  post_id VARCHAR(100) NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_address VARCHAR(42) NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  option_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_address)
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_post ON poll_votes(post_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_address);
