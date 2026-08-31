# Story 5.1: Community Listing

## Status
- Story key: 5-1-community-listing
- State: Complete
- Sprint: Sprint 1 - Foundation and Trust
- Priority: P1

## User Story
As a user, I want to browse communities with search/filter support and clear trust cues so I can choose safe groups and join confidently.

## Summary of Work Completed
- Extended community seed and default metadata to support discovery attributes (topics, format, location, moderation, verification).
- Added community API filtering by search query, topic, format, moderated-only, and verified-only.
- Added community detail endpoint for focused group exploration.
- Added joined membership state in community list/detail serialization for authenticated users.
- Built community discovery controls in the UI:
  - Search
  - Topic filter
  - Format filter
  - Moderated-only toggle
  - Verified-only toggle
- Added community detail panel in the UI with trust badges, topic/location metadata, membership status, and join action.
- Added regression tests for filtered listing and detail endpoint join-state behavior.

## Files Updated
- apps/api/server.js
- apps/api/seed-data.json
- apps/web/index.html
- apps/web/app.js
- apps/web/styles.css
- apps/api/tests/health.test.js
- _bmad-output/implementation-artifacts/rekindle-rise/sprint-status.yaml

## Acceptance Criteria Coverage
1. Build the community list screen and community detail view: complete.
2. Add the ability to join a community and view membership state: complete.
3. Add search, filter, and moderation/verification cues to help users choose safe groups: complete.

## Verification
- npm run lint: pass
- npm run format:check: pass
- npm test: pass
- npm run ci: pass
