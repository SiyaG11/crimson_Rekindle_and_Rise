# Rekindle & Rise

Privacy-first community platform for burn survivors and supporters.

## Local Development

1. Use Node.js 20 (see [.nvmrc](.nvmrc)).
2. Copy [.env.example](.env.example) to `.env` if you need local overrides.
3. Run the API app:

```bash
npm run dev
```

## Environment and Seeding

The API now supports environment-driven infrastructure settings and startup seeding.

```bash
# Regenerate default seed file
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

## Database Foundation

Initial database artifacts now live under `db/`:
- `db/migrations/001_initial_schema.sql`
- `db/seeds/001_seed_roles.sql`

To apply them against your configured Postgres instance:

```bash
# Requires DATABASE_URL and psql in PATH
npm run db:migrate
npm run db:seed
```

The API uses a persistence abstraction layer in `apps/api/persistence/store.js` so route handlers no longer mutate raw state arrays directly.

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


