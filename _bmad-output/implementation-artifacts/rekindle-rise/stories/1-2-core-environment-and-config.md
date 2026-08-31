# Story 1.2: Core Environment and Config

## Status
- Story key: 1-2-core-environment-and-config
- State: Complete
- Sprint: Sprint 1 - Foundation and Trust
- Priority: P0

## User Story
As the platform team, we want environment-driven runtime configuration, local infrastructure scaffolding, seed behavior, and infrastructure health checks so implementation can scale beyond in-memory-only development.

## Summary of Work Completed
- Added centralized runtime config handling in API server:
  - environment mode, port, log level
  - database/redis/object-storage endpoint config
  - seed controls and seed file path
- Added startup seeding support from JSON seed file.
- Added infrastructure health verification endpoints:
  - GET /health/infrastructure
  - GET /health/ready
- Added local container scaffolding:
  - docker-compose.dev.yml
  - apps/api/Dockerfile
- Added seed tooling and scripts:
  - scripts/seed-dev-data.js
  - npm run seed:dev
  - npm run health:infra
- Expanded .env.example for foundation infrastructure variables.
- Updated README with environment, seed, and container instructions.

## Files Added
- apps/api/seed-data.json
- scripts/seed-dev-data.js
- docker-compose.dev.yml
- apps/api/Dockerfile
- _bmad-output/implementation-artifacts/rekindle-rise/stories/1-2-core-environment-and-config.md

## Files Updated
- apps/api/server.js
- apps/api/tests/health.test.js
- .env.example
- package.json
- README.md
- _bmad-output/implementation-artifacts/rekindle-rise/sprint-status.yaml

## Acceptance Criteria Coverage
1. Environment variable handling for database/auth-like infra/logging: complete.
2. Local development containers and seed path established: complete.
3. Health-check endpoints for API and infrastructure verification: complete.

## Verification
- npm run lint: pass
- npm run format:check: pass
- npm test: pass (6/6)
- npm run ci: pass

## Definition of Done
- Core environment/config foundation is in place and documented.
- Infrastructure health is externally checkable through API endpoints.
- Story artifact completed and sprint status advanced.
