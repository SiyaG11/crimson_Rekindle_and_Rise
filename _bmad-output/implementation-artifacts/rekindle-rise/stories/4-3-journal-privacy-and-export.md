# Story 4.3: Journal Privacy and Export

## Status
- Story key: 4-3-journal-privacy-and-export
- State: Complete
- Sprint: Sprint 1 - Foundation and Trust
- Priority: P1

## User Story
As a signed-in user, I want journal entries to remain private by default and be exportable so I can keep control over my reflections and retain my data.

## Summary of Work Completed
- Enforced private-by-default visibility behavior in journal entry creation when no visibility is provided.
- Added journal export endpoints for full journal exports and single-entry exports.
- Added visible privacy indicators in the journal composer/history area.
- Added user-facing export actions in the journal UI:
  - Export all entries
  - Export individual entry
- Kept delete actions in history cards and aligned them with the updated privacy/export flow.
- Added API regression coverage for private-default behavior and export endpoints.

## Files Updated
- apps/api/persistence/store.js
- apps/api/server.js
- apps/api/tests/health.test.js
- apps/web/index.html
- apps/web/app.js
- apps/web/styles.css
- _bmad-output/implementation-artifacts/rekindle-rise/sprint-status.yaml

## Acceptance Criteria Coverage
1. Enforce private-by-default visibility rules: complete.
2. Add delete and export entry actions: complete.
3. Ensure export triggers downloadable artifact or placeholder workflow: complete.
4. Show a visible privacy indicator in composer and history views: complete.

## Verification
- npm run lint: pass
- npm run format:check: pass
- npm test: pass
- npm run ci: pass
