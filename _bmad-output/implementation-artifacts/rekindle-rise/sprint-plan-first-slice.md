# Sprint Plan for the First Slice

## Objective

Deliver a strong MVP slice that proves the core promise of Rekindle & Rise: users can register, complete onboarding, manage privacy, access a dashboard, and use a private journal experience.

## Slice Scope

### In scope for the first slice
- Authentication and onboarding
- Profile and privacy settings
- Dashboard/home experience
- Private journal entry creation and listing
- Basic community and event discovery surfaces
- Basic reporting and moderation hooks

### Out of scope for the first slice
- Full real-time chat
- Advanced recommendation engine
- Full organization admin console
- Complex analytics or multi-region deployment

---

## Sprint 1 — Foundation and Trust

### Goal
Create the foundation for account creation, safe onboarding, and secure profile management.

### Deliverables
- Monorepo setup and CI/CD pipeline
- Authentication flow and session handling
- Role selection and onboarding screens
- Profile and privacy settings persistence
- Database schema for users, roles, and privacy settings

### Exit criteria
- A new user can sign up and complete onboarding.
- Privacy settings are saved and default to private.
- The app can render the dashboard after onboarding.

---

## Sprint 2 — Journal and Core Engagement

### Goal
Deliver the first meaningful user value: private reflection and personal progress support.

### Deliverables
- Journal entry create/list/edit/delete
- Prompt-driven journaling experience
- Entry search and filtering
- Basic dashboard widgets linking to journal activity

### Exit criteria
- A user can create and view journal entries.
- The app supports saving private entries and later editing them.
- The journal experience feels calm, usable, and trustworthy.

---

## Sprint 3 — Community and Events

### Goal
Expand the first slice into connection and discovery experiences.

### Deliverables
- Community groups listing and detail views
- Event discovery with calendar and map support
- Event detail and RSVP flow
- Reporting and moderation action entry points

### Exit criteria
- Users can browse communities and events.
- A user can RSVP for an event and view event details.
- Moderation and safety hooks are accessible for future operations.

---

## Definition of Done for the Slice

The first slice is complete when:

- Core onboarding and journal flows work end to end.
- Privacy defaults and access rules are enforced.
- The main dashboard is usable and understandable.
- The app passes accessibility and basic usability checks.
- The deployment pipeline can run staging builds reliably.
