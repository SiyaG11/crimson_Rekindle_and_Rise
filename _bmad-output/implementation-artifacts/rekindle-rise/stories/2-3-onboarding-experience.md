# Story 2.3: Onboarding Experience

## Status
- Story key: 2-3-onboarding-experience
- State: Complete
- Sprint: Sprint 1 - Foundation and Trust
- Priority: P0

## User Story
As a new user, I want a calm onboarding flow that explains the product, captures my role and privacy preferences, and confirms completion so I can enter the dashboard with confidence.

## Summary of Work Completed
- Added a polished onboarding welcome section before account creation.
- Added step-style progress indicators for the onboarding experience.
- Added consent capture to registration and required it for completion.
- Added initial privacy defaults during registration and persisted them as part of the user record.
- Added completion behavior after registration that scrolls into the dashboard and loads session-aware content.
- Added clear validation feedback for missing onboarding inputs.
- Ensured onboarding data is visible in the authenticated user payload and private defaults summary.

## Files Updated
- apps/api/persistence/store.js
- apps/api/server.js
- apps/api/tests/health.test.js
- apps/web/app.js
- apps/web/index.html
- apps/web/styles.css
- _bmad-output/implementation-artifacts/rekindle-rise/sprint-status.yaml

## Acceptance Criteria Coverage
1. Create the onboarding UI for role selection and consent: complete.
2. Persist onboarding answers and initial privacy preferences: complete.
3. Add completion state and redirect into the dashboard: complete.
4. Include a polished welcome screen that explains the product promise before account creation: complete.
5. Add clear progress indicators and calm validation feedback across the onboarding flow: complete.

## Verification
- npm run lint: pass
- npm run format:check: pass
- npm test: pass (12/12)
- Browser smoke pass for register, onboarding, and logout flow: pass

## Definition of Done
- Onboarding now captures the product promise, consent, and privacy defaults.
- User record and `/api/v1/me` response persist onboarding details.
- The UI advances the user into the dashboard after successful registration.
