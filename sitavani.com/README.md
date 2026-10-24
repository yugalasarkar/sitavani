# SITAVANI

Sitavani runs as an Astro Node application. Astro pages and API routes use PostgreSQL for all editorial records; React is limited to the interactive article feed and editorial desk. There is no in-memory or fixture fallback when the database cannot be reached.

## Requirements

- Node.js 22.12 or newer (also recorded in `.nvmrc`)
- PostgreSQL 14 or newer
- npm

The PostgreSQL role needs permission to create and alter tables in the Sitavani database when applying migrations. The application role needs normal read, insert, and update privileges for the tables created by those migrations.

## Configure PostgreSQL

Create a database and a role used only by Sitavani. For example, connect to PostgreSQL as an administrator with `psql` and run:

```sql
CREATE ROLE sitavani LOGIN;
\password sitavani
CREATE DATABASE sitavani OWNER sitavani;
```

Copy `.env.example` to `.env` only if `.env` does not already exist, then set `DATABASE_URL`, `DATABASE_SSL`, and the two admin secrets. Special characters in a database username or password must be percent-encoded in the URL.

```text
DATABASE_URL=postgresql://sitavani:your-url-encoded-password@localhost:5432/sitavani
DATABASE_SSL=disable
DATABASE_POOL_MAX=10
```

Set `DATABASE_SSL=require` for a PostgreSQL server with TLS. TLS certificates are verified. `DATABASE_SSL` defaults to `require` when `NODE_ENV=production` and `disable` otherwise. The connection pool defaults to at most 10 connections; `DATABASE_POOL_MAX` accepts values from 1 to 50. Configuration is read only from environment variables.

Generate independent admin secrets of at least 32 characters:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

- `ADMIN_ACCESS_KEY` is the key entered at `/admin`.
- `ADMIN_SESSION_SECRET` signs the short-lived, HttpOnly admin session cookie.

Keep `.env` private and never commit it. The repository ignores `.env` files while tracking `.env.example`.

## Migrations

Versioned SQL files live in `database/migrations/`. The runner stores each applied version, filename, and SHA-256 checksum in `schema_migrations`, serializes concurrent migration runs with a PostgreSQL advisory lock, and applies each migration in its own transaction. An applied migration whose file changes is rejected.

Apply migrations before starting the application:

```sh
npm ci
npm run db:migrate
```

Migrations are explicit and do not run automatically at application startup. There are no known production records to migrate from the previous process-local repository, and no sample articles are seeded. If an earlier development process contained records, those records disappeared when that process stopped and cannot be recovered from this repository.

The initial schema contains:

- `sources`, including unique RSS endpoints and enabled state
- `articles`, with source attribution, canonical URL hash and optional stable source identifier, all supported categories and statuses, review metadata, editorial notes, and approval/publication/rejection timestamps
- `ingestion_runs` and `ingestion_logs` for persistent run history and the existing admin log view
- `ingest_keywords` for the existing keyword controls
- `schema_migrations` for migration tracking

There is no application settings store because the current application has no persistent settings operations. The news ingestion route remains unavailable until a later phase implements an ingestion worker.

## Development and production

For local development, configure `.env` to use your local PostgreSQL server with `DATABASE_SSL=disable`, then:

```sh
npm ci
npm run db:migrate
npm run dev
```

For a standalone Node deployment, configure the production environment variables and TLS, then run:

```sh
npm ci
npm run db:migrate
npm run build
npm start
```

The public feed and article pages show only `PUBLISHED` records. An authorized editor must approve a pending article and then explicitly publish it. The server performs each transition while holding a row lock in a transaction and writes the corresponding audit log in that same transaction. Discarded articles cannot be published; unpublishing returns an article to `APPROVED`.

## Tests

Use the dedicated database named exactly `sitavani_test`; the integration test deliberately drops and recreates that database's `public` schema before it tests migrations. It also requires a local connection unless `TEST_DATABASE_ALLOW_REMOTE=1` is explicitly set. Do not point `TEST_DATABASE_URL` at development or production data. A disposable local PostgreSQL service is provided for Docker Compose; it stores data in container memory and binds only to localhost:

```sh
docker compose -f compose.test.yml up -d --wait postgres-test
```

Create a test database owned by the test role, for example `sitavani_test`, then set `TEST_DATABASE_URL` and run:

```powershell
$env:TEST_DATABASE_URL = "postgresql://sitavani_test:sitavani-local-test-only@localhost:55432/sitavani_test"
$env:TEST_DATABASE_SSL = "disable"
npm.cmd run test:db
docker compose -f compose.test.yml down
```

The suite applies migrations to a clean database, applies them again to verify idempotency, tests source and article persistence, deduplication, editorial transitions, authorization and same-origin checks, database failure behavior, public feed queries, and a fresh Node process reading an existing article. It leaves the test database schema in place with its test records. `npm test` runs the same database integration suite.

## Backup and restore

Use PostgreSQL's custom archive format. Keep the archive outside the repository and protect it as database data:

```sh
pg_dump --format=custom --file=sitavani.dump "$DATABASE_URL"
```

Restore into a newly created database so the source database remains untouched:

```sh
createdb sitavani_restore
pg_restore --no-owner --dbname=sitavani_restore sitavani.dump
```

Take and periodically verify backups according to the deployment's recovery requirements. Include `schema_migrations` in the backup; it records which SQL versions are installed.

## Troubleshooting

- **`DATABASE_URL is not configured`**: set the variable in the application environment or `.env` and restart the process.
- **Database connection timeout/refused**: confirm the PostgreSQL service is running, the host and port are reachable from the app, and the database and role exist. The API returns HTTP 503 when PostgreSQL is unavailable; it does not return fabricated records or claim a failed write succeeded.
- **TLS connection errors**: use `DATABASE_SSL=require` for a trusted TLS endpoint, or `disable` only for a local connection that does not use TLS. The driver verifies certificates when TLS is enabled.
- **Migration fails**: the command names the failed migration. Fix the database permission or SQL error and rerun; committed migrations are skipped. Do not edit a migration already recorded in `schema_migrations`; create a new numbered migration instead.
- **Checksum mismatch**: restore the exact migration file that was originally applied, then add a new migration for further changes.
- **Test refuses to run**: `TEST_DATABASE_URL` must use the dedicated `sitavani_test` database on localhost. For a remote CI database, explicitly set `TEST_DATABASE_ALLOW_REMOTE=1`. The test runner intentionally resets the test database's `public` schema.

## Current scope

- Articles, source configuration, ingestion keywords, and admin log records persist in PostgreSQL.
- Article insertion always starts at `PENDING`; ingestion/model code cannot approve or publish through that operation.
- No existing production rows were present to migrate, and no sample news or unsupported live metrics are included.
- News ingestion and Ollama remain unimplemented. The ingestion control reports that no articles were fetched or added.
- The pulse, map, Vedic-to-space, and fact-check sections retain their empty states until source-reviewed records are configured.
- Failed admin login attempt counters remain process-local, matching the current rate-limit implementation; editorial records and status do not.

## Checks

```sh
npm run lint
npm run test:db
npm run build
npm audit
```
