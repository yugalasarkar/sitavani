import 'dotenv/config';
import { Pool, type PoolConfig } from 'pg';

export class DatabaseUnavailableError extends Error {
  constructor(message = 'PostgreSQL is unavailable.', options?: ErrorOptions) {
    super(message, options);
    this.name = 'DatabaseUnavailableError';
  }
}

let sharedPool: Pool | undefined;

function databaseConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new DatabaseUnavailableError('DATABASE_URL is not configured.');
  }

  let url: URL;
  try {
    url = new URL(connectionString);
  } catch (error) {
    throw new DatabaseUnavailableError('DATABASE_URL must be a valid PostgreSQL connection URL.', { cause: error });
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.pathname.slice(1)) {
    throw new DatabaseUnavailableError('DATABASE_URL must identify a PostgreSQL server and database.');
  }

  const rawMax = process.env.DATABASE_POOL_MAX;
  const max = rawMax === undefined || rawMax === '' ? 10 : Number(rawMax);
  if (!Number.isSafeInteger(max) || max < 1 || max > 50) {
    throw new DatabaseUnavailableError('DATABASE_POOL_MAX must be an integer from 1 to 50.');
  }

  const sslMode = (process.env.DATABASE_SSL || (process.env.NODE_ENV === 'production' ? 'require' : 'disable')).toLowerCase();
  if (!['disable', 'require'].includes(sslMode)) {
    throw new DatabaseUnavailableError('DATABASE_SSL must be either "disable" or "require".');
  }

  return {
    connectionString,
    max,
    min: 0,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    allowExitOnIdle: true,
    application_name: 'sitavani',
    ssl: sslMode === 'require' ? { rejectUnauthorized: true } : false
  };
}

export function getDatabasePool() {
  if (!sharedPool) {
    try {
      sharedPool = new Pool(databaseConfig());
      sharedPool.on('error', error => {
        // Pool errors can contain connection details. Log only the driver code.
        const code = 'code' in error && typeof error.code === 'string' ? error.code : error.name;
        console.error('PostgreSQL idle connection error:', code);
      });
    } catch (error) {
      if (error instanceof DatabaseUnavailableError) throw error;
      throw new DatabaseUnavailableError('PostgreSQL configuration could not be loaded.', { cause: error });
    }
  }
  return sharedPool;
}

export async function closeDatabasePool() {
  if (!sharedPool) return;
  const pool = sharedPool;
  sharedPool = undefined;
  await pool.end();
}

export function asDatabaseError(error: unknown) {
  if (error instanceof DatabaseUnavailableError) return error;
  return new DatabaseUnavailableError('The editorial database is temporarily unavailable. Please retry shortly.', { cause: error });
}
