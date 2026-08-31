# Story 1.3: Database Foundation

## Status
- Story key: 1-3-database-foundation
- State: Complete
- Sprint: Sprint 1 - Foundation and Trust
- Priority: P0

## User Story
As the platform team, we want an initial database schema, migration/seed tooling, and persistence abstraction so core domain logic can move safely from in-memory storage toward durable data.

## Summary of Work Completed
- Added initial SQL migration scaffold:
  - db/migrations/001_initial_schema.sql
  - includes users, roles, user_roles, profiles, privacy_settings, audit_logs
  - includes constraints and privacy-sensitive indexes
- Added seed scaffold:
  - db/seeds/001_seed_roles.sql
- Added migration tooling scripts:
  - scripts/db-migrate.js
  - scripts/db-seed.js
  - npm run db:migrate
  - npm run db:seed
- Added API persistence abstraction:
  - apps/api/persistence/store.js
  - API routes now use store methods rather than mutating raw state arrays directly
- Updated docs with database foundation instructions.

## Files Added
- apps/api/persistence/store.js
- db/migrations/001_initial_schema.sql
- db/seeds/001_seed_roles.sql
- scripts/db-migrate.js
- scripts/db-seed.js
- _bmad-output/implementation-artifacts/rekindle-rise/stories/1-3-database-foundation.md

## Files Updated
- apps/api/server.js
- package.json
- README.md
- _bmad-output/implementation-artifacts/rekindle-rise/sprint-status.yaml

## Acceptance Criteria Coverage
1. Initial schema for users/roles/profiles/privacy/audit: complete.
2. Migration tooling and seed scripts scaffolded: complete.
3. Constraints and indexes for privacy-sensitive access paths: complete.
4. Persistence abstraction introduced in API route handling: complete.

## Verification
- npm run lint: pass
- npm run format:check: pass
- npm test: pass (6/6)
- npm run ci: pass

## Definition of Done
- Database foundation artifacts exist and are documented.
- API behavior remains stable after persistence abstraction refactor.
- Sprint tracker advanced to the next story.
