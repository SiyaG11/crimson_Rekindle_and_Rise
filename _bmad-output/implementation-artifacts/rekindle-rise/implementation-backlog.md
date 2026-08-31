# Rekindle & Rise Implementation Backlog

## Goal
Turn the MVP plan into an actionable backlog for the first delivery slice.

## Backlog Principles
- Build the experience in thin vertical slices.
- Prioritize trust, privacy, and onboarding before richer social features.
- Keep each story testable and shippable.
- Use lightweight UI and API scaffolding first, then expand.

---

## Epic 0 — Experience System and UI Foundations

### Story 0.1 — Visual design system
- Define the core typography, spacing, color, card, chip, and button treatments.
- Establish a visual rhythm that feels polished on both mobile and desktop.
- Document trust cues, status treatments, and emphasis rules for sensitive UI.

### Story 0.2 — Responsive layout framework
- Build the shared responsive shell for landing, dashboard, and detail screens.
- Set breakpoints and layout rules for mobile-first and desktop-enhanced views.
- Ensure navigation, cards, and forms reflow cleanly without duplicate patterns.

### Story 0.3 — State coverage and content patterns
- Create loading, empty, error, and success states for core screens.
- Define plain-language helper text and confirmation messaging.
- Add visual treatment for privacy badges, verification labels, and moderation cues.

---

## Epic 1 — Platform Foundation

### Story 1.1 — Project bootstrap
- Create the monorepo structure for web and API.
- Add shared tooling for linting, formatting, testing, and environment management.
- Configure CI/CD and deployment placeholders.

### Story 1.2 — Core environment and config
- Add environment variable handling for database, auth, object storage, and logging.
- Configure local development containers and seed data.
- Add health-check endpoints for API and infrastructure verification.

### Story 1.3 — Database foundation
- Create the initial schema for users, roles, profiles, privacy settings, and audit logs.
- Add migration tooling and seed scripts.
- Add database constraints and indexes for privacy-sensitive lookups.

---

## Epic 2 — Authentication and Onboarding

### Story 2.1 — Registration flow
- Implement user registration with email/password.
- Validate required fields and role selection.
- Send verification email placeholder for later hardening.

### Story 2.2 — Login and session handling
- Implement login and token issuance.
- Add refresh-token rotation and logout support.
- Protect routes with authentication middleware.

### Story 2.3 — Onboarding experience
- Create the onboarding UI for role selection and consent.
- Persist onboarding answers and initial privacy preferences.
- Add completion state and redirect into the dashboard.
- Include a polished welcome screen that explains the product promise before account creation.
- Add clear progress indicators and calm validation feedback across the onboarding flow.

### Story 2.4 — Privacy defaults
- Create the privacy settings model and default values.
- Expose UI controls for profile, journal, and story visibility.
- Enforce these defaults in API responses.
- Explain each setting in plain language and make the default private state obvious in the UI.

---

## Epic 3 — Dashboard and Profile

### Story 3.1 — Dashboard shell
- Create the home/dashboard layout with navigation and section cards.
- Add quick actions for journaling, community, and events.
- Show personalized content placeholders for the first slice.
- Surface privacy status, upcoming activity, and quick trust cues in the dashboard summary.

### Story 3.2 — Profile management
- Create profile detail and settings pages.
- Support editing display name, photo, bio, and preferences.
- Store updated profile data and return it through the API.
- Organize settings into readable groups for profile, privacy, notifications, and security.

### Story 3.3 — Notification preferences
- Add a settings section for notifications and communication preferences.
- Persist preferences and expose defaults in the UI.

---

## Epic 4 — Private Journal MVP

### Story 4.1 — Journal entry model
- Create the journal entry schema and API endpoints for create/list/edit/delete.
- Support title, body, prompt reference, visibility, and timestamps.

### Story 4.2 — Journal UI
- Build the entry composer and list view.
- Add prompt-based entry starter and simple rich text or plain text input.
- Support saving drafts and viewing recent entries.
- Make the journal workspace calm, focused, and distraction-free.
- Include history cards with dates, mood or summary metadata, and clear edit/delete actions.

### Story 4.3 — Journal privacy and export
- Enforce private-by-default visibility rules.
- Add delete and export entry actions.
- Ensure export triggers a downloadable artifact or placeholder workflow.
- Show a visible privacy indicator in the composer and history views.

---

## Epic 5 — Community and Events MVP

### Story 5.1 — Community listing
- Build the community list screen and community detail view.
- Add the ability to join a community and view membership state.
- Add search, filter, and moderation/verification cues to help users choose safe groups.

### Story 5.2 — Event discovery
- Build the events page with list, calendar, and map-style presentation.
- Add event filters for date, location, format, and topic.
- Support event detail and RSVP actions.
- Present host, accessibility, verification, and safety notes before RSVP.

### Story 5.3 — Safety and moderation hooks
- Add report and block entry points for community content and event content.
- Persist moderation actions in the database.
- Flag content for review in the admin workflow later.
- Ensure moderation controls are visible but not visually dominant in community surfaces.

---

## Epic 6 — Quality, Security, and Release Readiness

### Story 6.1 — API and UI testing
- Add unit and integration tests for auth, privacy, journal, and event flows.
- Add end-to-end tests for onboarding and journaling.

### Story 6.2 — Accessibility and usability validation
- Audit the primary flows for keyboard support, contrast, and clarity.
- Resolve the highest-priority issues before staging signoff.

### Story 6.3 — Deployment and observability
- Configure staging deployment, logging, and monitoring.
- Prepare rollback and incident-response steps for launch readiness.

---

## Recommended Implementation Order

1. Experience system and UI foundations
2. Platform foundation and database
3. Authentication and onboarding
4. Profile and privacy settings
5. Dashboard shell
6. Journal MVP
7. Community and events MVP
8. Security, testing, and staging readiness

---

## Definition of Ready for Each Story

A story is ready when:
- the user value is clear
- acceptance criteria are defined
- API or UI contract is understood
- the required data model is known
- design or UX direction is available

## Definition of Done for the Backlog Slice

The first slice is done when:
- a user can register, onboard, and enter the dashboard through a polished responsive flow
- privacy defaults are stored, enforced, and explained in the UI
- journal entries can be created, viewed, and managed with clear states
- the user can browse community and event surfaces with moderation and verification cues
- the app is deployable to staging with working tests
