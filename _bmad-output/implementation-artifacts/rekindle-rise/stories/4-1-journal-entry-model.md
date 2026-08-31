# Story 4.1: Journal Entry Model

## Status
- Story key: 4-1-journal-entry-model
- State: Complete
- Sprint: Sprint 1 - Foundation and Trust
- Priority: P1

## User Story
As a signed-in user, I want robust journal entry APIs so I can create, list, edit, and delete private reflections with clear metadata.

## Summary of Work Completed
- Expanded the journal entry schema in persistence with `promptReference`, `visibility`, `createdAt`, and `updatedAt`.
- Added journal entry update and delete operations to the persistence store.
- Added API support for journal entry CRUD with authenticated create/list/edit/delete routes.
- Normalized journal entry serialization to enforce stable field names across responses.
- Updated the journal UI list to show prompt reference, visibility, update time, and to trigger edit/delete actions.
- Added API regression coverage for full journal entry CRUD behavior and schema fields.

## Files Updated
- apps/api/persistence/store.js
- apps/api/server.js
- apps/api/tests/health.test.js
- apps/web/app.js
- _bmad-output/implementation-artifacts/rekindle-rise/sprint-status.yaml

## Acceptance Criteria Coverage
1. Create the journal entry schema and API endpoints for create/list/edit/delete: complete.
2. Support title, body, prompt reference, visibility, and timestamps: complete.

## Verification
- npm run lint: pass
- npm run format:check: pass
- npm test: pass
- npm run ci: pass
