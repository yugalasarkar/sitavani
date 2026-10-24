CREATE TABLE sources (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  base_url TEXT NOT NULL CHECK (char_length(base_url) BETWEEN 1 AND 2048),
  rss_endpoint TEXT NOT NULL UNIQUE CHECK (char_length(rss_endpoint) BETWEEN 1 AND 2048),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_polled_at TIMESTAMPTZ
);

CREATE TABLE articles (
  id TEXT PRIMARY KEY CHECK (char_length(id) BETWEEN 1 AND 100),
  source_id BIGINT NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  source_name TEXT NOT NULL,
  source_identifier TEXT,
  url_hash CHAR(64) NOT NULL UNIQUE CHECK (url_hash ~ '^[0-9a-f]{64}$'),
  original_url TEXT NOT NULL CHECK (char_length(original_url) <= 2048),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  title_hi TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  summary_hi TEXT NOT NULL DEFAULT '',
  content_raw TEXT,
  image_url TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'HERITAGE', 'MANDIR', 'DEFENSE', 'SCIENCE', 'SANSKRIT', 'GOVERNANCE', 'NARRATIVE_FACTS', 'GENERAL'
  )),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PUBLISHED', 'DISCARDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  approved_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  discarded_at TIMESTAMPTZ,
  editorial_notes TEXT,
  matched_keywords TEXT[] NOT NULL DEFAULT '{}',
  salience TEXT CHECK (salience IS NULL OR salience IN ('LEAD', 'FEATURE', 'WIRE')),
  CONSTRAINT articles_source_identifier_unique UNIQUE (source_id, source_identifier),
  CONSTRAINT articles_status_timestamps CHECK (
    (status = 'PENDING' AND approved_at IS NULL AND published_at IS NULL AND discarded_at IS NULL)
    OR (status = 'APPROVED' AND approved_at IS NOT NULL AND published_at IS NULL AND discarded_at IS NULL)
    OR (status = 'PUBLISHED' AND approved_at IS NOT NULL AND published_at IS NOT NULL AND discarded_at IS NULL)
    OR (status = 'DISCARDED' AND published_at IS NULL AND discarded_at IS NOT NULL)
  ),
  CONSTRAINT articles_review_metadata CHECK (
    (status = 'PENDING' AND reviewed_at IS NULL AND reviewed_by IS NULL)
    OR (status IN ('APPROVED', 'PUBLISHED', 'DISCARDED') AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
  )
);

CREATE INDEX articles_public_feed_idx ON articles (published_at DESC, id) WHERE status = 'PUBLISHED';
CREATE INDEX articles_editorial_queue_idx ON articles (status, created_at DESC);
CREATE INDEX articles_category_status_idx ON articles (category, status, created_at DESC);

CREATE TABLE ingestion_runs (
  id UUID PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED', 'UNAVAILABLE')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  source_id BIGINT REFERENCES sources(id) ON DELETE SET NULL,
  articles_seen INTEGER NOT NULL DEFAULT 0 CHECK (articles_seen >= 0),
  articles_added INTEGER NOT NULL DEFAULT 0 CHECK (articles_added >= 0),
  message TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT ingestion_run_finished_after_start CHECK (finished_at IS NULL OR finished_at >= started_at),
  CONSTRAINT ingestion_run_state_matches_finish CHECK (
    (status = 'RUNNING' AND finished_at IS NULL) OR (status <> 'RUNNING' AND finished_at IS NOT NULL)
  ),
  CONSTRAINT ingestion_run_added_within_seen CHECK (articles_added <= articles_seen)
);

CREATE INDEX ingestion_runs_started_idx ON ingestion_runs (started_at DESC);

CREATE TABLE ingestion_logs (
  id TEXT PRIMARY KEY,
  run_id UUID REFERENCES ingestion_runs(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  level TEXT NOT NULL CHECK (level IN ('INFO', 'SUCCESS', 'WARN', 'FILTER', 'INGEST')),
  message TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX ingestion_logs_timestamp_idx ON ingestion_logs (timestamp DESC);

CREATE TABLE ingest_keywords (
  keyword TEXT PRIMARY KEY CHECK (char_length(keyword) BETWEEN 1 AND 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
