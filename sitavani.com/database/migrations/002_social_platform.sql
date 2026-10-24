CREATE TABLE IF NOT EXISTS users (
  wallet_address TEXT PRIMARY KEY CHECK (wallet_address ~* '^0x[0-9a-f]{40}$'),
  username TEXT UNIQUE CHECK (char_length(username) BETWEEN 3 AND 40),
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  bio TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'JIJNASU' CHECK (role IN ('JIJNASU', 'SADHAKA', 'PANDITA', 'ACHARYA', 'ADMIN')),
  karma_score INTEGER NOT NULL DEFAULT 0,
  is_verified_authority BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_nonces (
  nonce TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'JIJNASU',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sabhas (
  slug TEXT PRIMARY KEY CHECK (slug ~* '^[a-z0-9_-]+$'),
  name_sa TEXT NOT NULL,
  name_en TEXT NOT NULL,
  name_hi TEXT NOT NULL,
  description_en TEXT NOT NULL DEFAULT '',
  description_hi TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'Flame',
  color TEXT NOT NULL DEFAULT '#F59E0B',
  is_official BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  sabha_slug TEXT NOT NULL REFERENCES sabhas(slug) ON DELETE CASCADE,
  author_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 300),
  content TEXT NOT NULL DEFAULT '',
  media_url TEXT,
  media_type TEXT NOT NULL DEFAULT 'TEXT' CHECK (media_type IN ('IMAGE', 'LINK', 'TEXT')),
  original_url TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_official_dispatch BOOLEAN NOT NULL DEFAULT FALSE,
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  chain_tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS posts_sabha_score_idx ON posts (sabha_slug, score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_score_created_idx ON posts (is_pinned DESC, score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_created_idx ON posts (created_at DESC);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
  author_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_post_idx ON comments (post_id, created_at ASC);

CREATE TABLE IF NOT EXISTS votes (
  id TEXT PRIMARY KEY,
  user_address TEXT NOT NULL REFERENCES users(wallet_address) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('POST', 'COMMENT')),
  target_id TEXT NOT NULL,
  vote_value INTEGER NOT NULL CHECK (vote_value IN (1, -1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT votes_user_target_unique UNIQUE (user_address, target_type, target_id)
);

INSERT INTO users (wallet_address, username, display_name, bio, role, karma_score, is_verified_authority)
VALUES (
  '0xd22913b647d905d931e4dbbc36b2eecabb78329b',
  'sitavani_acharya',
  'सीतावाणी मुख्य सम्पादक (SITAVANI Head Editor)',
  'Official sovereign editorial desk and head acharya account for SITAVANI news and dispatches.',
  'ADMIN',
  108108,
  TRUE
) ON CONFLICT (wallet_address) DO UPDATE SET
  role = 'ADMIN',
  is_verified_authority = TRUE;

INSERT INTO sabhas (slug, name_sa, name_en, name_hi, description_en, description_hi, icon, color, is_official)
VALUES
  ('varta', 'वार्ता Vārtā', 'Dispatches & News', 'समाचार एवं संवाद', 'Verified news reporting, sovereign archives, and primary source dispatches.', 'सत्यापित समाचार, अभिलेख एवं अधिकृत सूचनाएँ।', 'Newspaper', '#F59E0B', TRUE),
  ('vijnana', 'विज्ञान Vijñāna', 'Science & Technology', 'विज्ञान एवं तकनीकी', 'Indigenous science, computing architectures, space, aerospace, and decentralized systems.', 'स्वदेशी विज्ञान, संगणक तंत्र, अंतरिक्ष एवं विकेंद्रीकृत प्रौद्योगिकी।', 'Atom', '#3B82F6', FALSE),
  ('itihasa', 'इतिहास Itihāsa', 'History & Chronology', 'इतिहास एवं कालक्रम', 'Archaeological discoveries, epigraphy, inscriptions, and civilizational history.', 'पुरातत्वीय अन्वेषण, अभिलेख शास्त्र एवं सभ्यतागत कालक्रम।', 'Scroll', '#10B981', FALSE),
  ('vastu', 'वास्तु Vāstu', 'Architecture & Arts', 'स्थापत्य एवं कला', 'Temple architecture, sculptural heritage, stone geometry, and ancient town planning.', 'मंदिर स्थापत्य, मूर्तिकला, प्रस्तर ज्यामिति एवं नगर नियोजन।', 'Landmark', '#8B5CF6', FALSE),
  ('raksa', 'रक्षा Rakṣā', 'Defense & Security', 'रक्षा एवं सामरिक नीति', 'Strategic defense, sovereign deterrence, maritime security, and border infrastructure.', 'सामरिक रक्षा, संप्रभु सुरक्षा, समुद्री रणनीति एवं सीमावर्ती तंत्र।', 'Shield', '#EF4444', FALSE),
  ('rajaniti', 'राजनीति Rājanīti', 'Statecraft & Governance', 'शासन एवं राजनीति', 'Dharmic statecraft, public administration, legal jurisprudence, and governance systems.', 'नीतिशास्त्र, लोक प्रशासन, विधि विधान एवं शासन प्रणालियाँ।', 'Scale', '#6366F1', FALSE),
  ('artha', 'अर्थ Artha', 'Economics & Trade', 'अर्थव्यवस्था एवं व्यापार', 'Economic sovereignty, trade routes, manufacturing, and indigenous resource systems.', 'आर्थिक संप्रभुता, व्यापार मार्ग, उद्योग एवं देशीय उत्पादन।', 'Coins', '#EC4899', FALSE),
  ('bhasa', 'भाषा Bhāṣā', 'Linguistics & Manuscripts', 'भाषा एवं पांडुलिपियाँ', 'Sanskrit grammatical traditions, Paninian linguistics, and manuscript preservation.', 'संस्कृत व्याकरण परंपरा, पाणिनीय भाषाविज्ञान एवं पांडुलिपि संरक्षण।', 'BookOpen', '#14B8A6', FALSE),
  ('vada', 'वाद Vāda', 'Dialectics & Debate', 'तर्क एवं संवाद', 'Nyaya logic, rigorous philosophical debates, evidence-based discourse, and refutation.', 'न्याय दर्शन, सप्रमाण शास्त्रार्थ, तार्किक विमर्श एवं खंडन-मंडन।', 'MessageSquare', '#F97316', FALSE),
  ('citra', 'चित्र Citra', 'Visual Archives & Media', 'चित्र एवं दृश्य अभिलेख', 'Archival photographs, manuscript scans, architectural drawings, and visual media.', 'दुर्लभ छायाचित्र, पांडुलिपि स्कैन, स्थापत्य रेखाचित्र एवं दृश्य माध्यम।', 'Image', '#06B6D4', FALSE),
  ('darsana', 'दर्शन Darśana', 'Philosophy & Epistemology', 'दर्शन एवं तत्त्वज्ञान', 'Six Darshana epistemologies, Vedic exegesis, metaphysics, and contemplative sciences.', 'षड्दर्शन विमर्श, वैदिक व्याख्या, तत्त्वज्ञान एवं अंतःचेतना विज्ञान।', 'Eye', '#A855F7', FALSE)
ON CONFLICT (slug) DO NOTHING;
