# Story 5.3: Safety and Moderation Hooks

## Status
- Story key: 5-3-safety-and-moderation-hooks
- State: Complete
- Sprint: Sprint 1 - Foundation and Trust
- Priority: P1

## User Story
As a user, I want report and block controls for community and event content so I can protect my experience and escalate safety concerns.

## Summary of Work Completed
- Added moderation persistence structures in the in-memory data model for reports and blocked resources.
- Added moderation endpoints:
  - POST /api/v1/moderation/report
  - POST /api/v1/moderation/block
  - GET /api/v1/moderation/review-queue (organization role)
- Added pending-review moderation queue semantics (`status: pending_review`) to support future admin workflow.
- Added blocked-content filtering for communities and events so blocked resources are hidden from the reporting user.
- Added subtle report/block controls in community and event detail panels.
- Added report-pending visual cues (`Report pending`) without making moderation controls visually dominant.
- Added regression tests for moderation reporting, blocking, filtered visibility, and review queue retrieval.

## Files Updated
- apps/api/persistence/store.js
- apps/api/server.js
- apps/web/app.js
- apps/web/styles.css
- apps/api/tests/health.test.js
- _bmad-output/implementation-artifacts/rekindle-rise/sprint-status.yaml

## Acceptance Criteria Coverage
1. Add report and block entry points for community content and event content: complete.
2. Persist moderation actions in the database layer: complete (in-memory persistence layer for current architecture).
3. Flag content for review in admin workflow later: complete (`pending_review` queue + review endpoint).
4. Ensure moderation controls are visible but not visually dominant in community surfaces: complete.

## Verification
- npm run lint: pass
- npm run format:check: pass
- npm test: pass
- npm run ci: pass
