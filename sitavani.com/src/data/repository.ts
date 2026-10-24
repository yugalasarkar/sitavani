import { createHash, randomUUID } from 'node:crypto';
import type { Pool, PoolClient, QueryResultRow } from 'pg';
import type { Article, ArticleStatus, DaemonLog, FeedStats, NewsCategory, Source } from '../types';
import { asDatabaseError, DatabaseUnavailableError, getDatabasePool } from './database';

export interface FeedQuery {
  category?: NewsCategory;
  search?: string;
  limit: number;
  offset: number;
}

export type EditorialActionInput = {
  article_id: string;
  action: 'APPROVE' | 'UPDATE_AND_APPROVE' | 'PUBLISH' | 'DISCARD' | 'UNPUBLISH';
  modified_title?: string;
  modified_title_hi?: string;
  modified_summary?: string;
  modified_summary_hi?: string;
  category?: NewsCategory;
  editorial_notes?: string;
};

export type EditorialActionResult =
  | { error: string; status: 400 | 404 | 409 }
  | { success: true; article: Article };

export type NewArticle = Omit<Article, 'status' | 'created_at' | 'reviewed_at' | 'reviewed_by' | 'approved_at' | 'published_at' | 'url_hash'>;

export interface NewsRepository {
  listPublishedArticles(query: FeedQuery): Promise<{ articles: Article[]; total: number; offset: number; limit: number }>;
  findPublishedArticle(id: string): Promise<Article | undefined>;
  getStats(): Promise<FeedStats>;
  listArticles(status?: ArticleStatus, category?: NewsCategory): Promise<Article[]>;
  getPendingArticles(): Promise<Article[]>;
  executeEditorialAction(input: EditorialActionInput): Promise<EditorialActionResult>;
  insertArticle(article: NewArticle): Promise<{ article: Article; inserted: boolean }>;
  listSources(): Promise<Source[]>;
  insertSource(source: Omit<Source, 'id' | 'created_at' | 'articles_count'>): Promise<Source | undefined>;
  toggleSource(id: number): Promise<Source | undefined>;
  listLogs(): Promise<DaemonLog[]>;
  appendLog(log: Omit<DaemonLog, 'id' | 'timestamp'>): Promise<void>;
  listKeywords(): Promise<string[]>;
  insertKeyword(keyword: string): Promise<void>;
}

type PgRow = QueryResultRow & Record<string, unknown>;

export class EditorialInputError extends Error {}

const categories: NewsCategory[] = [
  'HERITAGE', 'MANDIR', 'DEFENSE', 'SCIENCE', 'SANSKRIT', 'GOVERNANCE', 'NARRATIVE_FACTS', 'GENERAL'
];

function asIso(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new Error('Invalid timestamp returned by PostgreSQL.');
  return date.toISOString();
}

function mapArticle(row: PgRow): Article {
  const createdAt = asIso(row.created_at);
  if (!createdAt) throw new Error('PostgreSQL returned an article without a creation timestamp.');
  return {
    id: String(row.id),
    source_id: Number(row.source_id),
    source_name: String(row.source_name),
    source_identifier: row.source_identifier == null ? undefined : String(row.source_identifier),
    url_hash: String(row.url_hash).trim(),
    original_url: String(row.original_url),
    title: String(row.title),
    title_hi: String(row.title_hi),
    summary: String(row.summary),
    summary_hi: String(row.summary_hi),
    content_raw: row.content_raw == null ? undefined : String(row.content_raw),
    image_url: row.image_url == null ? undefined : String(row.image_url),
    category: row.category as NewsCategory,
    status: row.status as ArticleStatus,
    created_at: createdAt,
    reviewed_at: asIso(row.reviewed_at),
    reviewed_by: row.reviewed_by == null ? null : String(row.reviewed_by),
    approved_at: asIso(row.approved_at),
    published_at: asIso(row.published_at),
    editorial_notes: row.editorial_notes == null ? null : String(row.editorial_notes),
    matched_keywords: Array.isArray(row.matched_keywords) ? row.matched_keywords.map(String) : [],
    salience: row.salience == null ? undefined : row.salience as Article['salience']
  };
}

function mapSource(row: PgRow): Source {
  const id = Number(row.id);
  if (!Number.isSafeInteger(id)) throw new Error('PostgreSQL returned an unsafe source ID.');
  const createdAt = asIso(row.created_at);
  if (!createdAt) throw new Error('PostgreSQL returned a source without a creation timestamp.');
  return {
    id,
    name: String(row.name),
    base_url: String(row.base_url),
    rss_endpoint: String(row.rss_endpoint),
    is_active: Boolean(row.is_active),
    created_at: createdAt,
    last_polled_at: asIso(row.last_polled_at) || undefined,
    articles_count: Number(row.articles_count ?? 0)
  };
}

function mapLog(row: PgRow): DaemonLog {
  const timestamp = asIso(row.timestamp);
  if (!timestamp) throw new Error('PostgreSQL returned a log without a timestamp.');
  return {
    id: String(row.id),
    timestamp,
    level: row.level as DaemonLog['level'],
    message: String(row.message),
    details: row.details && typeof row.details === 'object' ? row.details as Record<string, unknown> : undefined
  };
}

function canonicalizeArticleUrl(value: string) {
  if (typeof value !== 'string' || value.length > 2048) throw new EditorialInputError('Original article URL must be text no longer than 2048 characters.');
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new EditorialInputError('Original article URL must be absolute HTTPS.');
  }
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw new EditorialInputError('Original article URL must use HTTPS and must not include credentials.');
  }
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_.+|fbclid|gclid|mc_cid|mc_eid)$/i.test(key)) url.searchParams.delete(key);
  }
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
  url.searchParams.sort();
  return url.toString();
}

export class PostgresNewsRepository implements NewsRepository {
  constructor(private readonly poolProvider: () => Pool = getDatabasePool) {}

  private get pool() {
    return this.poolProvider();
  }

  private async query<T extends PgRow>(text: string, values: unknown[] = []) {
    try {
      return await this.pool.query<T>(text, values);
    } catch (error) {
      throw asDatabaseError(error);
    }
  }

  private async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    let client: PoolClient;
    try {
      client = await this.pool.connect();
    } catch (error) {
      throw asDatabaseError(error);
    }
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      if (error instanceof DatabaseUnavailableError) throw error;
      if (error instanceof EditorialInputError) throw error;
      throw asDatabaseError(error);
    } finally {
      client.release();
    }
  }

  async listPublishedArticles({ category, search, limit, offset }: FeedQuery) {
    const normalizedSearch = search?.trim() || null;
    const [rows, count] = await Promise.all([
      this.query('SELECT * FROM articles WHERE status = \'PUBLISHED\' AND ($1::text IS NULL OR category = $1) AND ($2::text IS NULL OR concat_ws(\' \', title, title_hi, summary, summary_hi, source_name) ILIKE \'%\' || $2 || \'%\') ORDER BY published_at DESC, id ASC LIMIT $3 OFFSET $4', [category || null, normalizedSearch, limit, offset]),
      this.query<{ total: string }>('SELECT count(*)::text AS total FROM articles WHERE status = \'PUBLISHED\' AND ($1::text IS NULL OR category = $1) AND ($2::text IS NULL OR concat_ws(\' \', title, title_hi, summary, summary_hi, source_name) ILIKE \'%\' || $2 || \'%\')', [category || null, normalizedSearch])
    ]);
    return { articles: rows.rows.map(mapArticle), total: Number(count.rows[0]?.total || 0), offset, limit };
  }

  async findPublishedArticle(id: string) {
    const result = await this.query('SELECT * FROM articles WHERE id = $1 AND status = \'PUBLISHED\'', [id]);
    return result.rows[0] ? mapArticle(result.rows[0]) : undefined;
  }

  async getStats(): Promise<FeedStats> {
    const [articleRows, sourceRows, lastRunRows] = await Promise.all([
      this.query('SELECT status, category, count(*)::int AS count FROM articles GROUP BY status, category'),
      this.query<{ total: string; active: string }>('SELECT count(*)::text AS total, count(*) FILTER (WHERE is_active)::text AS active FROM sources'),
      this.query<{ timestamp: Date | string | null }>("SELECT max(finished_at) AS timestamp FROM ingestion_runs WHERE status IN ('SUCCEEDED', 'PARTIAL', 'FAILED')")
    ]);
    const categoryCounts = Object.fromEntries(categories.map(category => [category, 0])) as Record<NewsCategory, number>;
    const totals: Record<ArticleStatus, number> = { PENDING: 0, APPROVED: 0, PUBLISHED: 0, DISCARDED: 0 };
    for (const row of articleRows.rows) {
      const status = row.status as ArticleStatus;
      const category = row.category as NewsCategory;
      const count = Number(row.count);
      totals[status] += count;
      if (status === 'PUBLISHED') categoryCounts[category] += count;
    }
    const source = sourceRows.rows[0];
    return {
      total_approved: totals.APPROVED,
      total_published: totals.PUBLISHED,
      total_pending: totals.PENDING,
      total_discarded: totals.DISCARDED,
      total_sources: Number(source?.total || 0),
      active_sources: Number(source?.active || 0),
      category_counts: categoryCounts,
      last_daemon_run: asIso(lastRunRows.rows[0]?.timestamp)
    };
  }

  async listArticles(status?: ArticleStatus, category?: NewsCategory) {
    const result = await this.query('SELECT * FROM articles WHERE ($1::text IS NULL OR status = $1) AND ($2::text IS NULL OR category = $2) ORDER BY created_at DESC, id ASC', [status || null, category || null]);
    return result.rows.map(mapArticle);
  }

  async getPendingArticles() {
    const result = await this.query("SELECT * FROM articles WHERE status = 'PENDING' ORDER BY created_at DESC, id ASC");
    return result.rows.map(mapArticle);
  }

  async executeEditorialAction(input: EditorialActionInput): Promise<EditorialActionResult> {
    return this.transaction<EditorialActionResult>(async client => {
      const selected = await client.query('SELECT * FROM articles WHERE id = $1 FOR UPDATE', [input.article_id]);
      if (!selected.rows[0]) return { error: 'Article not found', status: 404 };
      const article = mapArticle(selected.rows[0]);
      let nextStatus: ArticleStatus = article.status;
      const now = new Date();
      let approvedAt = article.approved_at;
      let publishedAt = article.published_at;
      let discardedAt: string | null = null;
      let reviewedAt: string | null = null;

      if (input.action === 'APPROVE' || input.action === 'UPDATE_AND_APPROVE') {
        if (article.status !== 'PENDING') return { error: 'Only pending articles can be approved.', status: 409 };
        nextStatus = 'APPROVED';
        approvedAt = now.toISOString();
        reviewedAt = approvedAt;
        if (input.action === 'UPDATE_AND_APPROVE') {
          if (input.modified_title !== undefined) article.title = input.modified_title;
          if (input.modified_title_hi !== undefined) article.title_hi = input.modified_title_hi;
          if (input.modified_summary !== undefined) article.summary = input.modified_summary;
          if (input.modified_summary_hi !== undefined) article.summary_hi = input.modified_summary_hi;
          if (input.category !== undefined) article.category = input.category;
        }
        if (input.editorial_notes !== undefined) article.editorial_notes = input.editorial_notes;
      } else if (input.action === 'PUBLISH') {
        if (article.status !== 'APPROVED') return { error: 'Only approved articles can be published.', status: 409 };
        nextStatus = 'PUBLISHED';
        publishedAt = now.toISOString();
      } else if (input.action === 'DISCARD') {
        if (article.status !== 'PENDING' && article.status !== 'APPROVED') {
          return { error: 'This article cannot be rejected from its current state.', status: 409 };
        }
        nextStatus = 'DISCARDED';
        discardedAt = now.toISOString();
        reviewedAt = discardedAt;
        if (input.editorial_notes !== undefined) article.editorial_notes = input.editorial_notes;
      } else if (input.action === 'UNPUBLISH') {
        if (article.status !== 'PUBLISHED') return { error: 'Only published articles can be unpublished.', status: 409 };
        nextStatus = 'APPROVED';
        publishedAt = null;
      } else {
        return { error: 'Unsupported editorial action.', status: 400 };
      }

      const updated = await client.query(
        `UPDATE articles SET
          title = $2, title_hi = $3, summary = $4, summary_hi = $5, category = $6,
          status = $7, approved_at = $8, published_at = $9, discarded_at = $10,
          reviewed_at = COALESCE($11, reviewed_at), reviewed_by = CASE WHEN $11::timestamptz IS NULL THEN reviewed_by ELSE 'admin' END,
          editorial_notes = $12, updated_at = now()
        WHERE id = $1 RETURNING *`,
        [input.article_id, article.title, article.title_hi, article.summary, article.summary_hi, article.category,
          nextStatus, approvedAt, publishedAt, discardedAt, reviewedAt, article.editorial_notes]
      );
      const resultArticle = mapArticle(updated.rows[0]);
      await client.query(
        'INSERT INTO ingestion_logs (id, level, message, details) VALUES ($1, $2, $3, $4::jsonb)',
        [randomUUID(), 'INFO', `Editorial action ${input.action} recorded for article ${resultArticle.id}.`, JSON.stringify({ article_id: resultArticle.id, action: input.action, status: resultArticle.status })]
      );
      return { success: true, article: resultArticle };
    });
  }

  async insertArticle(article: NewArticle) {
    if (typeof article.id !== 'string' || !article.id.trim() || article.id.length > 100) throw new EditorialInputError('Article ID must be between 1 and 100 characters.');
    if (typeof article.title !== 'string' || !article.title.trim() || article.title.length > 300) throw new EditorialInputError('Article title must be between 1 and 300 characters.');
    if (!categories.includes(article.category)) throw new EditorialInputError('Article category is not supported.');
    if (!Number.isSafeInteger(article.source_id) || article.source_id < 1) throw new EditorialInputError('Article source ID is invalid.');
    if (article.title_hi !== undefined && (typeof article.title_hi !== 'string' || article.title_hi.length > 300)) {
      throw new EditorialInputError('Translated title must be text no longer than 300 characters.');
    }
    for (const [field, value] of [['summary', article.summary], ['summary_hi', article.summary_hi]] as const) {
      if (value !== undefined && (typeof value !== 'string' || value.length > 5000)) {
        throw new EditorialInputError(`${field} must be text no longer than 5000 characters.`);
      }
    }
    if (article.content_raw !== undefined && (typeof article.content_raw !== 'string' || article.content_raw.length > 1_000_000)) {
      throw new EditorialInputError('Raw article content must be text no longer than 1000000 characters.');
    }
    if (article.editorial_notes !== undefined && article.editorial_notes !== null &&
      (typeof article.editorial_notes !== 'string' || article.editorial_notes.length > 5000)) {
      throw new EditorialInputError('Editorial notes must be text no longer than 5000 characters.');
    }
    if (article.source_identifier !== undefined &&
      (typeof article.source_identifier !== 'string' || article.source_identifier.length > 512)) {
      throw new EditorialInputError('Source identifier must be text no longer than 512 characters.');
    }
    if (article.matched_keywords !== undefined && (!Array.isArray(article.matched_keywords) || article.matched_keywords.length > 100 ||
      article.matched_keywords.some(keyword => typeof keyword !== 'string' || !keyword.trim() || keyword.length > 80))) {
      throw new EditorialInputError('Matched keywords must contain at most 100 non-empty strings of up to 80 characters.');
    }
    if (article.salience !== undefined && article.salience !== 'LEAD' && article.salience !== 'FEATURE' && article.salience !== 'WIRE') {
      throw new EditorialInputError('Article salience is not supported.');
    }
    if (typeof article.original_url !== 'string') throw new EditorialInputError('Original article URL must be text.');
    if (article.image_url !== undefined && (typeof article.image_url !== 'string' || article.image_url.length > 2048)) {
      throw new EditorialInputError('Article image URL must be no longer than 2048 characters.');
    }
    const canonicalUrl = canonicalizeArticleUrl(article.original_url);
    if (canonicalUrl.length > 2048) throw new EditorialInputError('Canonical article URL must be no longer than 2048 characters.');
    const urlHash = createHash('sha256').update(canonicalUrl).digest('hex');
    if (article.image_url) {
      let imageUrl: URL;
      try {
        imageUrl = new URL(article.image_url);
      } catch {
        throw new EditorialInputError('Article image URL must be absolute HTTPS.');
      }
      if (imageUrl.protocol !== 'https:' || imageUrl.username || imageUrl.password) {
        throw new EditorialInputError('Article image URL must use HTTPS and must not include credentials.');
      }
    }
    return this.transaction(async client => {
      const source = await client.query('SELECT name, is_active FROM sources WHERE id = $1', [article.source_id]);
      if (!source.rows[0]) throw new EditorialInputError('Article source does not exist.');
      if (!source.rows[0].is_active) throw new EditorialInputError('Articles cannot be added from a disabled source.');
      const result = await client.query(
        `INSERT INTO articles (
          id, source_id, source_name, source_identifier, url_hash, original_url, title, title_hi,
          summary, summary_hi, content_raw, image_url, category, editorial_notes, matched_keywords, salience
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT DO NOTHING RETURNING *`,
        [article.id, article.source_id, source.rows[0].name, article.source_identifier || null, urlHash, canonicalUrl,
          article.title.trim(), article.title_hi || '', article.summary || '', article.summary_hi || '',
          article.content_raw || null, article.image_url || null, article.category, article.editorial_notes || null,
          article.matched_keywords || [], article.salience || null]
      );
      const inserted = result.rows[0] as PgRow | undefined;
      if (inserted) {
        const created = mapArticle(inserted);
        await client.query(
          'INSERT INTO ingestion_logs (id, level, message, details) VALUES ($1, $2, $3, $4::jsonb)',
          [randomUUID(), 'INGEST', `An unpublished article was added from ${created.source_name}.`, JSON.stringify({ article_id: created.id, source_id: created.source_id })]
        );
        return { article: created, inserted: true };
      }

      const duplicate = await client.query(
        'SELECT * FROM articles WHERE url_hash = $1 OR ($2::text IS NOT NULL AND source_id = $3 AND source_identifier = $2) ORDER BY (url_hash = $1) DESC LIMIT 2',
        [urlHash, article.source_identifier || null, article.source_id]
      );
      if (duplicate.rows.length > 1 && duplicate.rows[0].id !== duplicate.rows[1].id) {
        throw new EditorialInputError('The canonical URL and source identifier match different articles.');
      }
      if (duplicate.rows[0]) return { article: mapArticle(duplicate.rows[0]), inserted: false };
      throw new EditorialInputError('Article ID is already in use by another record.');
    });
  }

  async listSources() {
    const result = await this.query(
      `SELECT s.*, count(a.id)::int AS articles_count
       FROM sources s LEFT JOIN articles a ON a.source_id = s.id
       GROUP BY s.id ORDER BY s.created_at ASC, s.id ASC`
    );
    return result.rows.map(mapSource);
  }

  async insertSource(source: Omit<Source, 'id' | 'created_at' | 'articles_count'>) {
    return this.transaction(async client => {
      const result = await client.query(
        'INSERT INTO sources (name, base_url, rss_endpoint, is_active) VALUES ($1, $2, $3, $4) ON CONFLICT (rss_endpoint) DO NOTHING RETURNING *, 0::int AS articles_count',
        [source.name, source.base_url, source.rss_endpoint, source.is_active]
      );
      if (!result.rows[0]) return undefined;
      const created = mapSource(result.rows[0]);
      await client.query(
        'INSERT INTO ingestion_logs (id, level, message, details) VALUES ($1, $2, $3, $4::jsonb)',
        [randomUUID(), 'INFO', `News source ${created.name} was configured.`, JSON.stringify({ source_id: created.id })]
      );
      return created;
    });
  }

  async toggleSource(id: number) {
    return this.transaction(async client => {
      const result = await client.query(
        `UPDATE sources SET is_active = NOT is_active WHERE id = $1
         RETURNING *, (SELECT count(*)::int FROM articles WHERE source_id = sources.id) AS articles_count`, [id]
      );
      if (!result.rows[0]) return undefined;
      const source = mapSource(result.rows[0]);
      await client.query(
        'INSERT INTO ingestion_logs (id, level, message, details) VALUES ($1, $2, $3, $4::jsonb)',
        [randomUUID(), 'INFO', `News source ${source.name} ${source.is_active ? 'enabled' : 'disabled'}.`, JSON.stringify({ source_id: id })]
      );
      return source;
    });
  }

  async listLogs() {
    const result = await this.query('SELECT * FROM ingestion_logs ORDER BY timestamp DESC, id DESC LIMIT 50');
    return result.rows.map(mapLog);
  }

  async appendLog(log: Omit<DaemonLog, 'id' | 'timestamp'>) {
    await this.query(
      'INSERT INTO ingestion_logs (id, level, message, details) VALUES ($1, $2, $3, $4::jsonb)',
      [randomUUID(), log.level, log.message, JSON.stringify(log.details || {})]
    );
  }

  async listKeywords() {
    const result = await this.query('SELECT keyword FROM ingest_keywords ORDER BY keyword ASC');
    return result.rows.map(row => String(row.keyword));
  }

  async insertKeyword(keyword: string) {
    await this.query('INSERT INTO ingest_keywords (keyword) VALUES ($1) ON CONFLICT (keyword) DO NOTHING', [keyword]);
  }
}

export const newsRepository: NewsRepository = new PostgresNewsRepository();
