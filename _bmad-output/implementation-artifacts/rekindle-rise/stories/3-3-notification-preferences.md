# Story 3.3: Notification Preferences

## Status
- Story key: 3-3-notification-preferences
- State: Complete
- Sprint: Sprint 1 - Foundation and Trust
- Priority: P1

## User Story
As a signed-in user, I want to control notification and communication preferences so I can choose the channels and frequency that feel safe and manageable.

## Summary of Work Completed
- Added a dedicated notification settings section to the UI with channel and communication preference toggles.
- Added load and save logic in the frontend to read defaults from the authenticated user and persist updates.
- Extended the privacy update contract to accept validated notification preference values.
- Normalized notification preference defaults in persistence for onboarding and account updates.
- Extended API regression coverage to assert notification preferences persist correctly.

## Files Updated
- apps/web/index.html
- apps/web/styles.css
- apps/web/app.js
- apps/api/server.js
- apps/api/persistence/store.js
- apps/api/tests/health.test.js
- _bmad-output/implementation-artifacts/rekindle-rise/sprint-status.yaml

## Acceptance Criteria Coverage
1. Add a settings section for notifications and communication preferences: complete.
2. Persist preferences and expose defaults in the UI: complete.

## Verification
- npm run lint: pass
- npm run format:check: pass
- npm test: pass
- npm run ci: pass
