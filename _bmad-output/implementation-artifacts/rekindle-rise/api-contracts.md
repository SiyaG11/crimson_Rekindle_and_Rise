# Rekindle & Rise API Contract Decisions

## 1. API Conventions

- Base URL: /api/v1
- Authentication: Bearer token in Authorization header
- Response format: JSON with a consistent envelope
- Pagination: limit and cursor query parameters
- Error format: machine-readable error codes and user-safe messages

Example envelope:

```json
{
  "data": {},
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-08-06T00:00:00Z"
  }
}
```

---

## 2. Core Endpoints

### Authentication
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- POST /api/v1/auth/logout

### Profile and Privacy
- GET /api/v1/me
- PATCH /api/v1/me/profile
- GET /api/v1/me/privacy
- PATCH /api/v1/me/privacy

### Journal
- GET /api/v1/journal/entries
- POST /api/v1/journal/entries
- GET /api/v1/journal/entries/:id
- PATCH /api/v1/journal/entries/:id
- DELETE /api/v1/journal/entries/:id

### Communities
- GET /api/v1/communities
- GET /api/v1/communities/:id
- POST /api/v1/communities
- POST /api/v1/communities/:id/join
- POST /api/v1/communities/:id/posts

### Events
- GET /api/v1/events
- GET /api/v1/events/:id
- POST /api/v1/events
- POST /api/v1/events/:id/rsvp

### Moderation
- POST /api/v1/reports
- GET /api/v1/moderation/reports
- PATCH /api/v1/moderation/reports/:id

---

## 3. Contract Decisions

### Identity and access
- All protected routes require an authenticated user.
- Role-based access is enforced server-side for admin and moderator actions.

### Privacy model
- Privacy settings are stored as explicit visibility rules and applied on every read request.
- Journal entries are private by default unless the user explicitly changes visibility.

### Content handling
- Create/update/delete actions should return the persisted entity and a normalized metadata block.
- Soft delete is preferred for content moderation and user deletion workflows.

### Event discovery
- Events support filters by date, location, format, and host type.
- Event list endpoints should support both calendar-style and map-style consumption.

---

## 4. Recommended Schema Notes

### User
- id
- role
- displayName
- email
- createdAt
- privacySettingsId

### PrivacySettings
- profileVisibility
- journalVisibility
- storySharing
- notificationPreferences

### JournalEntry
- id
- userId
- title
- body
- promptId
- visibility
- createdAt
- updatedAt

### Event
- id
- organizerId
- title
- description
- startsAt
- endsAt
- location
- format
- accessibilityNotes
- isVerified

These contracts should be treated as the baseline contract for the first slice and extended as features mature.
