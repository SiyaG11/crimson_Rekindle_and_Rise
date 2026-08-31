# Story 2.4: Privacy Defaults

## Status
- Story key: 2-4-privacy-defaults
- State: Complete
- Sprint: Sprint 1 - Foundation and Trust
- Priority: P0

## User Story
As a new user, I want privacy defaults to be private by default and easy to understand so I can trust the platform before sharing anything.

## Summary of Work Completed
- Added story-sharing to the privacy model and onboarding flow.
- Ensured new accounts default to private profile, journal, and story sharing settings.
- Exposed story-sharing controls in onboarding and privacy settings.
- Updated the privacy summary to explain profile, journal, and story defaults in plain language.
- Added API sanitization so privacy values remain within the approved set.
- Kept onboarding privacy preferences synchronized when privacy settings are updated later.

## Files Updated
- apps/api/persistence/store.js
- apps/api/server.js
- apps/api/tests/health.test.js
- apps/web/app.js
- apps/web/index.html
- apps/web/styles.css
- _bmad-output/implementation-artifacts/rekindle-rise/sprint-status.yaml

## Acceptance Criteria Coverage
1. Create the privacy settings model and default values: complete.
2. Expose UI controls for profile, journal, and story visibility: complete.
3. Enforce these defaults in API responses: complete.
4. Explain each setting in plain language and make the default private state obvious in the UI: complete.

## Verification
- npm run lint: pass
- npm run format:check: pass
- npm test: pass (12/12)
- npm run ci: pass
- Browser smoke pass for onboarding privacy defaults and privacy save flow: pass

## Definition of Done
- New users start with private defaults across the core privacy dimensions.
- The UI and API both communicate the privacy state clearly.
- Privacy updates remain synchronized with onboarding preferences.
