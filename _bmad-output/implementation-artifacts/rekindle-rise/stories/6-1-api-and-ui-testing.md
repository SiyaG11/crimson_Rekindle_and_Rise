# Story 6.1: API and UI Testing

## Status
- Story key: 6-1-api-and-ui-testing
- State: Complete
- Sprint: Sprint 1 - Foundation and Trust
- Priority: P1

## User Story
As a product team, we want stronger automated API and UI journey coverage so regressions in onboarding, privacy, journaling, and events are caught early.

## Summary of Work Completed
- Added a dedicated quality test suite file for Story 6.1 coverage.
- Added UI contract checks against served HTML to verify critical app surfaces remain present.
- Added end-to-end onboarding test coverage (register -> onboarding defaults -> authenticated profile retrieval).
- Added end-to-end journaling test coverage (create -> update -> export -> delete lifecycle).
- Kept the existing broad integration suite and validated compatibility with all recent social, community, event, and moderation work.

## Files Updated
- apps/api/tests/quality.test.js
- _bmad-output/implementation-artifacts/rekindle-rise/sprint-status.yaml

## Acceptance Criteria Coverage
1. Add unit and integration tests for auth, privacy, journal, and event flows: complete (integration coverage expanded and validated).
2. Add end-to-end tests for onboarding and journaling: complete (new quality suite includes full journey tests).

## Verification
- npm run lint: pass
- npm run format:check: pass
- npm test: pass
- npm run ci: pass
- Combined suite now passing: 22 tests
