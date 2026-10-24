import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
import type { Pool } from 'pg';
import { DatabaseUnavailableError } from '../src/data/database';
import { PostgresNewsRepository, type NewArticle } from '../src/data/repository';
import { createAdminSessionCookie } from '../src/lib/adminAuth';
import { dataErrorResponse } from '../src/lib/api';
import { DEFAULT_MIGRATIONS_DIRECTORY, runMigrations } from '../scripts/migrate.mjs';

const { Pool: PgPool } = pg;
const databaseUrl = process.env.TEST_DATABASE_URL;
if (!databaseUrl) {
  throw new Error('Set TEST_DATABASE_URL to the dedicated sitavani_test PostgreSQL database.');
}
const parsedDatabaseUrl = new URL(databaseUrl);
const databaseName = parsedDatabaseUrl.pathname.slice(1);
if (databaseName.toLowerCase() !== 'sitavani_test') {
  throw new Error('Refusing to reset a database unless its name is exactly sitavani_test.');
}
if (!['localhost', '127.0.0.1', '[::1]'].includes(parsedDatabaseUrl.hostname) && process.env.TEST_DATABASE_ALLOW_REMOTE !== '1') {
  throw new Error('Refusing to reset a remote test database unless TEST_DATABASE_ALLOW_REMOTE=1 is explicit.');
}

process.env.DATABASE_URL = databaseUrl;
process.env.DATABASE_SSL = process.env.TEST_DATABASE_SSL || 'disable';
process.env.ADMIN_ACCESS_KEY = 'integration-test-admin-access-key-32-chars';
process.env.ADMIN_SESSION_SECRET = 'integration-test-session-secret-32-chars';

const pool = new PgPool({
  connectionString: databaseUrl,
  ssl: process.env.TEST_DATABASE_SSL === 'require' ? { rejectUnauthorized: true } : false,
  connectionTimeoutMillis: 5_000,
  max: 5
});
const repository = new PostgresNewsRepository(() => pool as Pool);

let feedRoute: typeof import('../src/pages/api/feed').GET;
let articleActionRoute: typeof import('../src/pages/api/admin/articles/action').POST;
let testSourceId: number;

function articleInput(id: string, overrides: Partial<NewArticle> = {}): NewArticle {
  return {
    id,
    source_id: testSourceId,
    source_name: 'Caller supplied name is ignored',
    original_url: `https://news.example.test/story/${id}`,
    title: `Article ${id}`,
    title_hi: `Hindi ${id}`,
    summary: `Summary ${id}`,
    summary_hi: `Hindi summary ${id}`,
    category: 'SCIENCE',
    editorial_notes: null,
    matched_keywords: [],
    salience: 'WIRE',
    ...overrides
  };
}

describe('PostgreSQL persistence and editorial API', () => {
  beforeAll(async () => {
    const client = await pool.connect();
    try {
      // Destructive setup is restricted to an explicitly named *_test database.
      await client.query('DROP SCHEMA IF EXISTS public CASCADE');
      await client.query('CREATE SCHEMA public');
    } finally {
      client.release();
    }
    await expect(runMigrations(pool, { migrationsDirectory: DEFAULT_MIGRATIONS_DIRECTORY })).resolves.toEqual(['001']);
    await expect(runMigrations(pool, { migrationsDirectory: DEFAULT_MIGRATIONS_DIRECTORY })).resolves.toEqual(['001']);
    feedRoute = (await import('../src/pages/api/feed')).GET;
    articleActionRoute = (await import('../src/pages/api/admin/articles/action')).POST;
  }, 30_000);

  beforeEach(async () => {
    await pool.query('TRUNCATE TABLE articles, sources, ingestion_logs, ingestion_runs, ingest_keywords RESTART IDENTITY CASCADE');
    const source = await repository.insertSource({
      name: 'Test News',
      base_url: 'https://news.example.test',
      rss_endpoint: 'https://news.example.test/rss.xml',
      is_active: true
    });
    if (!source) throw new Error('Test source was not created.');
    testSourceId = source.id;
  });

  afterAll(async () => {
    await pool.end();
  });

  it('migrates a clean database and safely skips already recorded migrations', async () => {
    const result = await pool.query('SELECT version, name FROM schema_migrations ORDER BY version');
    expect(result.rows).toEqual([{ version: '001', name: '001_initial_schema.sql' }]);
  });

  it('persists sources, keywords, published article queries, and status totals', async () => {
    const source = (await repository.listSources())[0];
    expect(source).toMatchObject({ id: testSourceId, name: 'Test News', is_active: true, articles_count: 0 });
    expect(await repository.insertSource({
      name: 'Duplicate Feed', base_url: 'https://news.example.test', rss_endpoint: 'https://news.example.test/rss.xml', is_active: true
    })).toBeUndefined();

    await repository.insertKeyword('science');
    await repository.insertKeyword('science');
    expect(await repository.listKeywords()).toEqual(['science']);

    const pending = await repository.insertArticle(articleInput('persisted-1'));
    expect(pending.inserted).toBe(true);
    expect(pending.article).toMatchObject({ status: 'PENDING', source_name: 'Test News', approved_at: null, published_at: null });
    expect((await repository.listSources())[0].articles_count).toBe(1);
    expect(await repository.findPublishedArticle('persisted-1')).toBeUndefined();

    await repository.executeEditorialAction({ article_id: 'persisted-1', action: 'APPROVE' });
    await repository.executeEditorialAction({ article_id: 'persisted-1', action: 'PUBLISH' });
    const published = await repository.findPublishedArticle('persisted-1');
    expect(published?.status).toBe('PUBLISHED');
    expect((await repository.listPublishedArticles({ category: 'SCIENCE', limit: 10, offset: 0 })).articles).toHaveLength(1);
    expect((await repository.getStats()).total_published).toBe(1);

    const toggled = await repository.toggleSource(testSourceId);
    expect(toggled?.is_active).toBe(false);
    await expect(repository.insertArticle(articleInput('disabled-source-article')))
      .rejects.toThrow('Articles cannot be added from a disabled source.');
    expect((await repository.listLogs()).length).toBeGreaterThan(0);
  });

  it('forces incoming articles to pending and deduplicates normalized URLs and source IDs', async () => {
    const created = await repository.insertArticle(articleInput('duplicate-1', {
      original_url: 'https://news.example.test/story?id=1&utm_source=wire',
      source_identifier: 'vendor-123'
    }));
    expect(created.inserted).toBe(true);
    expect(created.article.status).toBe('PENDING');
    expect(created.article.published_at).toBeNull();

    const sameCanonicalUrl = await repository.insertArticle(articleInput('duplicate-2', {
      original_url: 'https://news.example.test/story/?utm_source=another&id=1',
      source_identifier: 'vendor-456'
    }));
    expect(sameCanonicalUrl.inserted).toBe(false);
    expect(sameCanonicalUrl.article.id).toBe('duplicate-1');

    const sameStableId = await repository.insertArticle(articleInput('duplicate-3', {
      original_url: 'https://news.example.test/updated-story',
      source_identifier: 'vendor-123'
    }));
    expect(sameStableId.inserted).toBe(false);
    expect(sameStableId.article.id).toBe('duplicate-1');
  });

  it('enforces approval, explicit publication, rejection, and unpublish transitions transactionally', async () => {
    await repository.insertArticle(articleInput('workflow-1'));
    const earlyPublish = await repository.executeEditorialAction({ article_id: 'workflow-1', action: 'PUBLISH' });
    expect(earlyPublish).toMatchObject({ error: 'Only approved articles can be published.', status: 409 });
    await repository.executeEditorialAction({
      article_id: 'workflow-1', action: 'UPDATE_AND_APPROVE', modified_title: 'Reviewed title', category: 'HERITAGE'
    });
    expect((await repository.listArticles('APPROVED', 'HERITAGE'))[0].title).toBe('Reviewed title');
    await repository.executeEditorialAction({ article_id: 'workflow-1', action: 'PUBLISH' });
    await repository.executeEditorialAction({ article_id: 'workflow-1', action: 'UNPUBLISH' });
    expect((await repository.findPublishedArticle('workflow-1'))).toBeUndefined();
    expect((await repository.listArticles())[0]).toMatchObject({ status: 'APPROVED', published_at: null });

    await repository.insertArticle(articleInput('workflow-discarded'));
    await repository.executeEditorialAction({ article_id: 'workflow-discarded', action: 'DISCARD' });
    const publishDiscarded = await repository.executeEditorialAction({ article_id: 'workflow-discarded', action: 'PUBLISH' });
    expect(publishDiscarded).toMatchObject({ error: 'Only approved articles can be published.', status: 409 });
    expect((await repository.listArticles())[0].status).toBe('DISCARDED');
  });

  it('keeps editorial writes behind authentication and same-origin checks', async () => {
    await repository.insertArticle(articleInput('api-protected'));
    const unauthorized = await articleActionRoute({
      request: new Request('http://localhost/api/admin/articles/action', {
        method: 'POST', headers: { origin: 'http://localhost', host: 'localhost', 'content-type': 'application/json' },
        body: JSON.stringify({ article_id: 'api-protected', action: 'APPROVE' })
      })
    } as never);
    expect(unauthorized.status).toBe(401);
    expect((await repository.listArticles())[0].status).toBe('PENDING');

    const cookie = createAdminSessionCookie()?.split(';')[0];
    expect(cookie).toBeTruthy();
    const crossOrigin = await articleActionRoute({
      request: new Request('http://localhost/api/admin/articles/action', {
        method: 'POST', headers: { origin: 'https://evil.example', host: 'localhost', cookie: cookie!, 'content-type': 'application/json' },
        body: JSON.stringify({ article_id: 'api-protected', action: 'APPROVE' })
      })
    } as never);
    expect(crossOrigin.status).toBe(403);

    const authorized = await articleActionRoute({
      request: new Request('http://localhost/api/admin/articles/action', {
        method: 'POST', headers: { origin: 'http://localhost', host: 'localhost', cookie: cookie!, 'content-type': 'application/json' },
        body: JSON.stringify({ article_id: 'api-protected', action: 'APPROVE' })
      })
    } as never);
    expect(authorized.status).toBe(200);
    expect((await repository.listArticles())[0].status).toBe('APPROVED');
  });

  it('returns persisted feed records through the public API', async () => {
    await repository.insertArticle(articleInput('feed-api'));
    await repository.executeEditorialAction({ article_id: 'feed-api', action: 'APPROVE' });
    await repository.executeEditorialAction({ article_id: 'feed-api', action: 'PUBLISH' });
    const response = await feedRoute({ url: new URL('http://localhost/api/feed?category=SCIENCE') } as never);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ total: 1, articles: [{ id: 'feed-api', status: 'PUBLISHED' }] });
  });

  it('fails closed on database errors instead of returning in-memory records', async () => {
    const unavailablePool = new PgPool({
      host: '127.0.0.1', port: 1, database: 'sitavani_test', user: 'test', password: 'test', connectionTimeoutMillis: 250
    });
    try {
      const unavailableRepository = new PostgresNewsRepository(() => unavailablePool);
      await expect(unavailableRepository.listArticles()).rejects.toBeInstanceOf(DatabaseUnavailableError);
      await expect(unavailableRepository.executeEditorialAction({ article_id: 'any', action: 'APPROVE' }))
        .rejects.toBeInstanceOf(DatabaseUnavailableError);
      const response = dataErrorResponse(new DatabaseUnavailableError('The editorial database is temporarily unavailable. Please retry shortly.'));
      expect(response.status).toBe(503);
      await expect(response.json()).resolves.toMatchObject({ error: 'The editorial database is temporarily unavailable. Please retry shortly.' });
    } finally {
      await unavailablePool.end();
    }
  });

  it('keeps records visible to a fresh Node process after a restart boundary', async () => {
    await repository.insertArticle(articleInput('restart-persisted'));
    const childScript = [
      "import pg from 'pg';",
      "const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, ssl: process.env.TEST_DATABASE_SSL === 'require' ? { rejectUnauthorized: true } : false, connectionTimeoutMillis: 5000 });",
      "try { const result = await pool.query('SELECT id FROM articles WHERE id = $1', ['restart-persisted']); process.exitCode = result.rowCount === 1 ? 0 : 2; }",
      "catch { process.exitCode = 3; } finally { await pool.end(); }"
    ].join('\n');
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', childScript], {
      env: { ...process.env, TEST_DATABASE_URL: databaseUrl },
      encoding: 'utf8',
      timeout: 15_000
    });
    expect(child.error).toBeUndefined();
    expect(child.status).toBe(0);
  });
});
