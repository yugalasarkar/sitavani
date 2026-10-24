import 'dotenv/config';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_MIGRATIONS_DIRECTORY = resolve(scriptDirectory, '../database/migrations');
const MIGRATION_LOCK_ID = 1_384_045_907;

function poolConfig(connectionString) {
  if (!connectionString) throw new Error('DATABASE_URL is not configured.');
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.pathname.slice(1)) {
    throw new Error('DATABASE_URL must identify a PostgreSQL server and database.');
  }
  const mode = (process.env.DATABASE_SSL || (process.env.NODE_ENV === 'production' ? 'require' : 'disable')).toLowerCase();
  if (!['disable', 'require'].includes(mode)) throw new Error('DATABASE_SSL must be either "disable" or "require".');
  return {
    connectionString,
    max: 2,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 5_000,
    ssl: mode === 'require' ? { rejectUnauthorized: true } : false,
    application_name: 'sitavani-migrations'
  };
}

async function listMigrations(directory) {
  const names = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
  for (const name of names) {
    if (!/^\d{3,}_[a-z0-9_]+\.sql$/.test(name)) {
      throw new Error(`Invalid migration filename: ${name}`);
    }
  }
  if (new Set(names.map(name => name.slice(0, name.indexOf('_')))).size !== names.length) {
    throw new Error('Migration version prefixes must be unique.');
  }
  return Promise.all(names.map(async name => {
    const sql = await readFile(resolve(directory, name), 'utf8');
    return { version: name.slice(0, name.indexOf('_')), name, sql, checksum: createHash('sha256').update(sql).digest('hex') };
  }));
}

export async function runMigrations(pool, { migrationsDirectory = DEFAULT_MIGRATIONS_DIRECTORY } = {}) {
  const client = await pool.connect();
  let locked = false;
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID]);
    locked = true;
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      checksum CHAR(64) NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);

    const applied = await client.query('SELECT version, name, checksum FROM schema_migrations ORDER BY version');
    const appliedByVersion = new Map(applied.rows.map(row => [row.version, row]));
    const migrations = await listMigrations(migrationsDirectory);
    for (const migration of migrations) {
      const record = appliedByVersion.get(migration.version);
      if (record) {
        if (record.name !== migration.name || record.checksum.trim() !== migration.checksum) {
          throw new Error(`Applied migration ${migration.name} no longer matches its recorded name or checksum.`);
        }
        continue;
      }

      try {
        await client.query('BEGIN');
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO schema_migrations (version, name, checksum) VALUES ($1, $2, $3)',
          [migration.version, migration.name, migration.checksum]
        );
        await client.query('COMMIT');
        appliedByVersion.set(migration.version, migration);
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        const detail = error instanceof Error ? error.message : 'Unknown database error';
        throw new Error(`Migration ${migration.name} failed: ${detail}`, { cause: error });
      }
    }
    return migrations.map(migration => migration.version);
  } finally {
    if (locked) await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]).catch(() => undefined);
    client.release();
  }
}

async function main() {
  let pool;
  try {
    pool = new Pool(poolConfig(process.env.DATABASE_URL?.trim()));
    const versions = await runMigrations(pool);
    console.log(`Database migrations are up to date (${versions.length} migration${versions.length === 1 ? '' : 's'}).`);
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown migration error';
    console.error(`Database migration failed: ${detail}`);
    process.exitCode = 1;
  } finally {
    await pool?.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
