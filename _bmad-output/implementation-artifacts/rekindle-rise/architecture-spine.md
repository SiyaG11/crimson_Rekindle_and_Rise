# Rekindle & Rise Architecture Spine

## 1. Product Architecture Principles

The implementation should be driven by five non-negotiable principles:

1. Privacy-by-default
   - Sensitive profile and journal content must default to private.
   - Access control is enforced in the service layer, not only at the UI layer.

2. Safety and trust
   - Moderation, reporting, blocking, and audit trails are first-class capabilities.
   - Content visibility and account actions must be auditable.

3. Modular bounded domains
   - Authentication, profiles, communities, journal, events, moderation, and notifications should remain independently evolvable.

4. Mobile-first responsive delivery
   - The interface must work well on mobile first and scale to desktop.
   - Shared domain logic should be used across web and mobile surfaces.

5. Production reliability
   - The system must support observability, automated testing, background jobs, and operational recovery from the start.

---

## 2. Concrete Architecture Spine

### Frontend
- Framework: Next.js 14+ with React and TypeScript
- Styling: Tailwind CSS + shadcn/ui for consistent design-system delivery
- State: React Query for server state, Zustand for local UI state
- Forms: React Hook Form + Zod validation
- Client-side routing: App Router in Next.js
- Accessibility: WCAG 2.1 AA baseline for all core flows

### Backend
- Runtime: NestJS on Node.js 20+
- Language: TypeScript
- API style: REST with versioned routes under /api/v1
- Auth: JWT access tokens + refresh token rotation
- Validation: shared DTOs and Zod-style server validation
- Background jobs: BullMQ or similar queue for notifications, moderation actions, and sync tasks

### Data Layer
- Primary database: PostgreSQL
- Cache and session support: Redis
- Object storage: S3-compatible storage for images, attachments, and exported journal files
- Search and discovery: PostgreSQL full-text search for the first slice; Elasticsearch later if needed

### Infrastructure
- Containerization: Docker
- CI/CD: GitHub Actions
- Hosting: AWS ECS/Fargate or equivalent managed container platform
- Monitoring: Sentry + OpenTelemetry + structured logs
- Environment strategy: local, staging, production

---

## 3. Domain Boundaries

### Auth & Identity
Responsible for registration, login, password reset, role selection, refresh tokens, and account deactivation.

### Profiles & Privacy
Responsible for public/private profile data, visibility rules, notification preferences, and account settings.

### Communities
Responsible for group discovery, memberships, posts, comments, reactions, and moderation visibility rules.

### Journal
Responsible for private journal entries, prompts, attachments, export/delete flows, and search.

### Events
Responsible for events, RSVP, host metadata, accessibility details, and location-based filtering.

### Moderation
Responsible for reports, action review, content visibility decisions, and audit log creation.

### Notifications
Responsible for email/push/in-app notifications derived from actions in the other domains.

---

## 4. Architectural Invariants

These are the core invariants that should remain true throughout implementation:

- Every sensitive resource must be checked against the user’s role and privacy policy before read or write access.
- Journal content must remain private by default unless explicitly shared.
- Moderation decisions must be persisted and traceable.
- All user-facing writes must produce an audit event.
- Every important domain action must have a corresponding test path.

---

## 5. Recommended Delivery Shape

The first slice should be delivered as a monorepo with:

- apps/web for the frontend
- apps/api for the backend
- packages/shared for DTOs, enums, and validation rules
- packages/ui for shared design-system primitives

This structure keeps the architecture clear while avoiding over-complication for the first implementation phase.
