# Story 2.2: Login and Session Handling

## Status
- Story key: 2-2-login-and-session-handling
- State: Complete
- Sprint: Sprint 1 - Foundation and Trust
- Priority: P0

## User Story
As a returning user, I want secure login and session lifecycle controls so I can access private content safely and end sessions when needed.

## Summary of Work Completed
- Implemented login/session API contract:
  - `POST /api/v1/auth/login` now issues both access token and refresh token.
  - `POST /api/v1/auth/refresh` rotates refresh token and returns fresh token pair.
  - `POST /api/v1/auth/logout` revokes active session by access token and/or refresh token.
- Added persistence-layer session lifecycle in store:
  - issue session
  - find user by active access token
  - rotate active session
  - revoke session
- Updated auth middleware behavior:
  - protected endpoints now resolve authenticated user through active access-token sessions.
- Updated frontend session handling:
  - Added register/login mode switching in onboarding form.
  - Added sign-out flow using logout endpoint.
  - Added authenticated API helper with automatic refresh-token retry on 401.
  - Stores and rotates access/refresh token pair in local storage.
- Added test coverage for auth session lifecycle:
  - login issues access+refresh tokens
  - refresh rotates tokens and invalidates stale refresh tokens
  - logout revokes session and blocks subsequent protected access

## Files Updated
- apps/api/persistence/store.js
- apps/api/server.js
- apps/api/tests/health.test.js
- apps/web/app.js
- apps/web/index.html
- apps/web/styles.css
- _bmad-output/implementation-artifacts/rekindle-rise/sprint-status.yaml

## Acceptance Criteria Coverage
1. Implement login and token issuance: complete.
2. Add refresh-token rotation and logout support: complete.
3. Protect routes with authentication middleware: complete.

## Verification
- npm run lint: pass
- npm run format:check: pass
- npm test: pass (11/11)
- npm run ci: pass

## Definition of Done
- Session lifecycle is implemented end-to-end.
- Protected API routes reject revoked or stale sessions.
- Frontend can register, sign in, refresh session transparently, and sign out.
