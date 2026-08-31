# Story 3.1: Dashboard Shell

## Status
- Story key: 3-1-dashboard-shell
- State: Complete
- Sprint: Sprint 1 - Foundation and Trust
- Priority: P1

## User Story
As a signed-in user, I want a personalized dashboard shell with clear next actions so I can quickly orient myself and move to the most useful part of the app.

## Summary of Work Completed
- Added a personalized dashboard header with greeting, role label, and next-activity spotlight.
- Added quick actions that jump to journaling, communities, and events.
- Connected the dashboard to live auth/session data and live event/community counts.
- Preserved trust cues, privacy state, and calm daily morale messaging on the main home surface.

## Files Updated
- apps/web/index.html
- apps/web/app.js
- apps/web/styles.css
- _bmad-output/implementation-artifacts/rekindle-rise/sprint-status.yaml

## Acceptance Criteria Coverage
1. Create the home/dashboard layout with navigation and section cards: complete.
2. Add quick actions for journaling, community, and events: complete.
3. Show personalized content placeholders for the first slice: complete.
4. Surface privacy status, upcoming activity, and quick trust cues in the dashboard summary: complete.

## Verification
- npm run lint: pass
- npm run format:check: pass
- npm test: pass
- npm run ci: pass
- Browser smoke pass for dashboard personalization and quick actions: pass
