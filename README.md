# Rekindle & Rise

Privacy-first community platform for burn survivors and supporters.

## Local Development

1. Use Node.js 20 (see [.nvmrc](.nvmrc)).
2. Start a local PostgreSQL instance that matches `DATABASE_URL` in [.env.example](.env.example), or start the `postgres` service with Docker Compose.
3. Copy [.env.example](.env.example) to `.env`. `npm run dev` loads this file and requires a reachable database so account data is durable.
4. Apply the database migration and role seed:

```bash
npm run db:migrate
npm run db:seed
```

5. Run the API app:

```bash
npm run dev
```

`npm run dev` exits if `.env` is missing or PostgreSQL cannot be reached; it does not silently use volatile account storage. The Docker Compose workflow continues to provide its own `DATABASE_URL` to the same command.

## Environment and Seeding

The API now supports environment-driven infrastructure settings and startup seeding.

```bash
# Purge mutable development data and seed the complete 10-user dataset
npm run seed:dev

# Check infrastructure configuration health (API must be running)
npm run health:infra
```

Key environment variables are in [.env.example](.env.example):
- `DATABASE_URL`
- `REDIS_URL`
- `OBJECT_STORAGE_ENDPOINT`
- `LOG_LEVEL`
- `SEED_ON_START`
- `SEED_FILE`

## Local Container Stack

A local development container stack is provided for API + Postgres + Redis + MinIO:

```bash
docker compose -f docker-compose.dev.yml up --build
```

The development API container automatically applies the database migrations and role seed before it starts.

## Database Foundation

Initial database artifacts now live under `db/`:
- `db/migrations/001_initial_schema.sql`
- `db/seeds/001_seed_roles.sql`

To apply them against your configured Postgres instance before starting the API:

```bash
# Requires DATABASE_URL and psql in PATH
npm run db:migrate
npm run db:seed
```

The API loads its durable application state from PostgreSQL at startup and writes every account, session, profile, journal, social, community, event, and moderation change back before responding. The persistence adapter lives in `apps/api/persistence/store.js`; the process keeps an in-memory cache only to retain the existing synchronous route contract. Passwords are stored as scrypt hashes, never as their submitted plaintext values.

## Quality Commands

```bash
# Syntax lint for core JS runtime files
npm run lint

# Formatting and trailing whitespace checks
npm run format:check

# API tests
npm test

# Combined CI-like local check
npm run ci

# Smoke-check a staging deployment (defaults to local URL)
npm run staging:smoke

# Run CI + staging smoke check
npm run deploy:staging:check
```

## Observability Endpoints

- `GET /health` basic service health.
- `GET /health/infrastructure` dependency configuration checks.
- `GET /health/ready` readiness gate for staging/production probes.
- `GET /health/metrics` lightweight in-process request metrics.

The API emits structured JSON request logs when `REQUEST_LOGGING=true` and can disable metrics with `METRICS_ENABLED=false`.

## CI Placeholder

GitHub Actions workflow is available at [.github/workflows/ci.yml](.github/workflows/ci.yml) and currently runs lint, format checks, and tests on pull requests and pushes.


