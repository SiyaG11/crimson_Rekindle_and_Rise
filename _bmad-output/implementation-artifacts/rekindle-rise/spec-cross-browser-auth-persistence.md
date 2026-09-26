---
title: 'Cross-browser account authentication and PostgreSQL persistence'
type: 'bugfix'
created: '2026-09-26'
status: 'done'
review_loop_iteration: 0
baseline_commit: '179ebf45bb69b7f59560161cbc1c6f9d157592d2'
context:
  - '{project-root}/README.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A person who has already registered can arrive in another browser and be shown registration by default because the page infers account existence from browser-local storage. Direct host development can also launch without `DATABASE_URL`, causing the server to retain accounts only in process memory instead of PostgreSQL.

**Approach:** Treat the server-side account directory as authoritative: present sign-in as the unauthenticated default in every browser while retaining deliberate registration for new users, and make the documented host-development path load the existing PostgreSQL configuration. Prove that credentials created before an API restart can authenticate in a fresh client session.

## Boundaries & Constraints

**Always:** Keep email/password authentication server-side; preserve the current registration validation, duplicate-email rejection, password hashing, token/refresh flow, existing Compose PostgreSQL volume, and all user-owned worktree changes. A successful registration must be persisted before the response; a second browser receives its own session after entering the same credentials.

**Ask First:** Changing the account identity model, password policy, database schema format, or introducing a hosted identity provider.

**Never:** Use browser `localStorage` as evidence that an account exists, silently fall back to volatile account storage for the documented persistent development workflow, expose password hashes or session secrets, or overwrite existing PostgreSQL account data.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Existing account in a fresh browser | No auth-related local storage; registered email and valid password in PostgreSQL | Auth page opens in sign-in mode and login returns a new token pair for the persisted user | Invalid credentials keep the user signed out and show the existing generic login failure |
| First-time visitor | No local storage; no matching server-side account | Sign-in mode exposes a clear path to registration; successful registration creates exactly one persisted account | Duplicate email remains a `409` and does not create a second account |
| API restart after registration | Account registration has completed; next server instance uses the same PostgreSQL state | Login with the original credentials succeeds after hydration | Database initialization failures continue to prevent the persistent runtime from starting |
| Host development command | `.env` was created from `.env.example` with the local PostgreSQL URL | `npm run dev` loads `DATABASE_URL` and uses the persistence adapter | Missing/unavailable database is reported rather than misrepresented as durable storage |

</frozen-after-approval>

## Code Map

- `apps/web/app.js` -- Chooses initial auth mode, binds account-mode controls, submits registration/login requests, and manages browser-local tokens.
- `apps/web/auth.html` -- Auth form and explicit account-mode switch available to first-time and returning users.
- `apps/api/server.js` -- Initializes the persistence-backed API and awaits hydration before listening.
- `apps/api/persistence/store.js` -- Hydrates and flushes the PostgreSQL JSONB snapshot that contains users and sessions.
- `package.json` and `.env.example` -- Define the host development launch contract and local PostgreSQL connection.
- `apps/api/tests/health.test.js` -- Existing registration/login endpoint coverage to extend with a persistence-focused regression.

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/app.js` -- Default unauthenticated auth pages to sign-in, remove reliance on the browser-only account-exists flag for initial mode selection, and keep explicit registration/sign-in switching reachable. This ensures a new browser can authenticate an account registered elsewhere.
- [x] `apps/web/auth.html` -- Make the account-mode control unambiguous from the initial sign-in state, without changing registration fields or consent behavior.
- [x] `package.json`, `.env.example`, and `README.md` -- Make the documented host command load the configured local PostgreSQL URL and state the prerequisite clearly, so development registration is durable instead of silently in-memory.
- [x] `apps/api/tests/health.test.js` (and a focused persistence test/helper only if needed) -- Cover a registration followed by login from a fresh unauthenticated client context and verify that persistent runtime configuration is selected. Preserve isolated, no-external-service unit tests.

**Acceptance Criteria:**
- Given a registered account and a browser with no Rekindle & Rise local storage, when the visitor opens `/auth.html`, then the form is ready to sign in and submitting correct credentials opens an authenticated session.
- Given a first-time visitor, when they select registration and complete valid required fields, then the server creates one account and a later sign-in uses that same account rather than attempting another registration.
- Given the documented host development setup and an initialized local PostgreSQL service, when `npm run dev` starts the API, then `DATABASE_URL` is supplied to the persistence store and a restart retains registered credentials.
- Given an existing account email, when a registration attempt repeats it, then the API still returns `409` and the persisted account remains unchanged.

## Spec Change Log

## Verification

**Commands:**
- `npm test` -- expected: auth and persistence regression coverage passes.
- `npm run lint` -- expected: changed JavaScript parses successfully.
- `npm run format:check` -- expected: changed files comply with repository formatting rules.
- `docker compose -f docker-compose.dev.yml up --build -d api` followed by a register, API restart, and login request -- expected: the original credentials authenticate after restart.

## Suggested Review Order

**Durable Account Creation**

- Creates the account and session as one rollback-safe persistence operation.
  [store.js:315](../../../apps/api/persistence/store.js#L315)

- Surfaces write failures as `503` rather than acknowledging unsaved state.
  [server.js:451](../../../apps/api/server.js#L451)

- Routes registration through the atomic account operation.
  [server.js:927](../../../apps/api/server.js#L927)

**Cross-Browser Sign-In**

- Opens every unauthenticated browser in sign-in mode without local account inference.
  [app.js:108](../../../apps/web/app.js#L108)

- Keeps hidden registration consent from blocking sign-in validation.
  [app.js:610](../../../apps/web/app.js#L610)

**Runtime and Regression Coverage**

- Loads local PostgreSQL configuration for the host development command.
  [package.json:6](../../../package.json#L6)

- Covers fresh-store hydration and failed-save rollback/retry behavior.
  [persistence.test.js:24](../../../apps/api/tests/persistence.test.js#L24)
