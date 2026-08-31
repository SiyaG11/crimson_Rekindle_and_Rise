# Story 0.1: Visual Design System

## Status
- Story key: 0-1-visual-design-system
- State: Complete
- Sprint: Sprint 1 - Foundation and Trust
- Priority: P0

## User Story
As a user, I want a consistent layout, typography, and component system, so that the app feels polished and easy to navigate.

## Why This Story Matters
This story establishes the visual language that every upcoming feature will inherit. Without it, onboarding, privacy, journal, community, and events will remain visually inconsistent and difficult to harden for production.

## Scope
Implement the initial design system foundation in the existing web app so upcoming stories can build on stable tokens and reusable UI primitives.

## In Scope
- Typography scale and hierarchy for page title, section title, body, helper text, and metadata.
- Color tokens for brand, surfaces, text, borders, status, and trust indicators.
- Spacing, radius, and elevation tokens.
- Reusable component styles for buttons, chips, cards, panels, form fields, and stat tiles.
- Trust-cue treatments (verified, moderated, private-by-default).
- Baseline style guidance for loading, empty, success, and error states.

## Out of Scope
- API contract changes.
- Business logic changes in auth, privacy, journal, communities, or events.
- Full framework migration (Next.js/NestJS) in this story.

## Relevant Context
- Current implementation: Node + static web shell in apps/web and apps/api.
- Architecture alignment: privacy-by-default, safety-and-trust, mobile-first responsive delivery.
- UX direction: premium but calm, trauma-informed tone, clear trust signals.

## Target Files
- apps/web/styles.css
- apps/web/index.html
- _bmad-output/design-artifacts/rekindle-rise/mockups.html
- _bmad-output/design-artifacts/rekindle-rise/ux-mockup-screens.md (only if any visual-contract notes need reconciliation)

## Implementation Tasks
1. Define foundation tokens in apps/web/styles.css:
   - color palette, typography scale, spacing scale, radius, and shadows.
2. Normalize reusable UI primitives in apps/web/styles.css:
   - button variants, chip variants, card/panel containers, form controls, stat tiles.
3. Update apps/web/index.html structure only where needed to apply new reusable primitives cleanly.
4. Add state classes in styles.css for:
   - loading, empty, success, error.
5. Add trust-indicator classes and apply them to existing sections:
   - privacy summary, moderated communities, verified events.
6. Sync visual preview artifact in mockups.html with the same token language and component intent.
7. Keep interactions and API wiring unchanged to avoid behavior regressions.

## Acceptance Criteria
1. The app uses a consistent typography hierarchy across headings, body copy, and helper text.
2. All core surfaces use shared tokens for color, border, radius, and shadow.
3. Buttons, chips, cards, and form controls are visually consistent across onboarding, dashboard, journal, communities, events, and settings.
4. Trust indicators are clearly visible for private, moderated, and verified contexts.
5. State styles exist for loading, empty, success, and error and are reusable in future stories.
6. The updated UI remains readable and functional on mobile and desktop breakpoints.
7. Existing API-driven flows still function (register, privacy update, journal save, community join).

## Verification Plan
- Visual verification:
  - Open apps/web and confirm typography, tokens, and component consistency across all sections.
  - Compare with mockups.html for alignment.
- Behavioral regression checks:
  - Run node --test apps/api/tests/health.test.js and ensure all tests pass.
  - Manually verify create account, save privacy, save entry, and join community actions still respond.

## Dependencies
- Pre-req: Existing app shell and API endpoints are already available.
- Follow-on stories enabled:
  - 0-2-responsive-layout-framework
  - 0-3-state-coverage-content-patterns
  - 2-3-onboarding-experience
  - 3-1-dashboard-shell

## Risks and Mitigations
- Risk: Over-styling introduces inconsistent one-off classes.
  - Mitigation: Centralize tokens and primitives before page-level tweaks.
- Risk: Visual updates accidentally break button affordance or readability.
  - Mitigation: maintain contrast and button hierarchy checks in both mobile and desktop.
- Risk: HTML reshuffle breaks JS selectors.
  - Mitigation: preserve existing ids used by apps/web/app.js.

## Definition of Done
- Tokenized style foundation exists and is used by current screens.
- Trust cues and state styles are implemented.
- No regression in existing backend-driven UI interactions.
- Story file is ready for dev execution in the next context window.

## Notes for Dev Story Agent
- Favor minimal HTML changes; most of this story should be handled in styles.css.
- Keep selectors and ids stable.
- Do not replace existing functional JS behavior in apps/web/app.js.
