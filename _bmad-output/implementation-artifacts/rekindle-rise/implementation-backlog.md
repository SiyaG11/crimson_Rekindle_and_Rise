# Rekindle & Rise Implementation Backlog

## Goal
Turn the MVP plan into an actionable backlog for the first delivery slice.

## Backlog Principles
- Build the experience in thin vertical slices.
- Prioritize trust, privacy, and onboarding before richer social features.
- Keep each story testable and shippable.
- Use lightweight UI and API scaffolding first, then expand.

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

### Story 2.4 — Privacy defaults
- Create the privacy settings model and default values.
- Expose UI controls for profile, journal, and story visibility.
- Enforce these defaults in API responses.

---

## Epic 3 — Dashboard and Profile

### Story 3.1 — Dashboard shell
- Create the home/dashboard layout with navigation and section cards.
- Add quick actions for journaling, community, and events.
- Show personalized content placeholders for the first slice.

### Story 3.2 — Profile management
- Create profile detail and settings pages.
- Support editing display name, photo, bio, and preferences.
- Store updated profile data and return it through the API.

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

### Story 4.3 — Journal privacy and export
- Enforce private-by-default visibility rules.
- Add delete and export entry actions.
- Ensure export triggers a downloadable artifact or placeholder workflow.

---

## Epic 5 — Community and Events MVP

### Story 5.1 — Community listing
- Build the community list screen and community detail view.
- Add the ability to join a community and view membership state.

### Story 5.2 — Event discovery
- Build the events page with list, calendar, and map-style presentation.
- Add event filters for date, location, and format.
- Support event detail and RSVP actions.

### Story 5.3 — Safety and moderation hooks
- Add report and block entry points for community content and event content.
- Persist moderation actions in the database.
- Flag content for review in the admin workflow later.

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

1. Platform foundation and database
2. Authentication and onboarding
3. Profile and privacy settings
4. Dashboard shell
5. Journal MVP
6. Community and events MVP
7. Security, testing, and staging readiness

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
- a user can register, onboard, and enter the dashboard
- privacy defaults are stored and enforced
- journal entries can be created and viewed
- the user can browse community and event surfaces
- the app is deployable to staging with working tests
