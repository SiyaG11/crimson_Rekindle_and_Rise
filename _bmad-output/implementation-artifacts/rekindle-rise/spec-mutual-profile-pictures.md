---
title: 'Show mutual profile pictures on Community cards'
type: 'feature'
created: '2026-10-16'
status: 'done'
baseline_commit: '5cd719ba289dae0e1ff49074c1764271de90a6d0'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** A selected member profile reports how many mutual followers a member shares with the signed-in user, but does not show who those shared connections are. This makes the count less useful for deciding whether to connect.

**Approach:** Extend the authenticated discovery response with a small, privacy-aligned preview of shared followers, then render their profile photos or initials as compact avatars only on the selected member profile.

## Boundaries & Constraints

**Always:** Preserve the existing mutual follower count and relationship behavior; return only the profile information already exposed by discovery; show at most three mutual avatar previews on the selected member profile; provide an accessible textual label for the avatar group; use initials when a mutual has no `photoUrl`; keep Community cards usable when there are no mutuals.

**Ask First:** Adding a new privacy model, uploading or sourcing new profile images, changing the follow relationship semantics, or showing more than three mutual profiles.

**Never:** Expose email addresses, private account data, credentials, or full follower lists in the new preview; make per-card client requests; replace the card owner avatar or remove the existing mutual count.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Mutual preview available | Viewer and selected member share one or more followers | Discovery returns the count and up to three `{ id, displayName, profile: { photoUrl } }` entries; member profile shows a labeled compact avatar group plus the existing count | Missing photo uses initials |
| No shared followers | Viewer and selected member share none | Discovery returns an empty preview and count `0`; member profile does not render an empty avatar group | N/A |
| More than preview limit | Viewer and card owner share four or more followers | Count reflects all shared followers; preview contains only the first three in stable follower-list order | N/A |
| Legacy or incomplete profile | Mutual profile is absent or has no usable photo | Card remains rendered; affected preview shows initials derived from display name | Skip malformed/missing profile data safely |

</frozen-after-approval>

## Code Map

- `apps/api/server.js` -- serializes authenticated user discovery results at `GET /api/v1/users`.
- `apps/api/tests/health.test.js` -- integration coverage for authentication, follow relationships, profile updates, and API responses.
- `apps/web/app.js` -- renders Community directory profile cards in `renderSocialDirectory()`.
- `apps/web/styles.css` -- defines the existing `user-card` and mutual-follower presentation styles.

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/server.js` -- derive shared-follower profile previews from the existing user collection during discovery serialization, cap them at three, and retain the existing aggregate count -- gives the card renderer the data it needs without extra network calls.
- [x] `apps/api/tests/health.test.js` -- add authenticated discovery coverage for shared profiles with photo and no-photo cases, plus preview capping -- protects the API contract and relationship calculation.
- [x] `apps/web/app.js` -- render the mutual preview avatars only on the selected member profile, with photo and initials fallbacks and an accessible aggregate label -- makes shared connections identifiable without reducing card resilience.
- [x] `apps/web/styles.css` -- style a fixed-size, overlapping member-profile mutual-avatar group consistent with the existing mobile layout -- keeps the added signal compact and legible.

**Acceptance Criteria:**
- Given a signed-in viewer and a selected member whose profile has shared followers with that viewer, when the member profile loads, then it shows up to three shared-follower avatars alongside the full mutual follower total.
- Given a shared follower with a profile photo, when their member-profile avatar preview renders, then the photo is cropped within the compact circular avatar and has meaningful accessible context through the group label.
- Given a shared follower without a profile photo, when their member-profile avatar preview renders, then initials appear instead of a broken image.
- Given no shared followers, when a member profile renders, then it does not reserve blank avatar-group space.
- Given a Community directory card, when it renders, then it shows only the existing mutual follower count and no mutual-avatar preview.
- Given more than three shared followers, when discovery is returned, then the count includes every shared follower while the avatar preview contains exactly three records.

## Spec Change Log

## Design Notes

The discovery endpoint already returns profile data for selected members, so preview entries use the same constrained public shape rather than a new endpoint or follower-list contract. The preview order follows the candidate's existing `followers` order, avoiding a new ranking policy.

## Verification

**Commands:**
- `node --test apps/api/tests/health.test.js` -- expected: the new discovery assertions and existing API integration tests pass.
- `npm run ci` -- expected: lint, format check, and all test suites pass.

**Manual checks:**
- Open Community while signed in and confirm cards show only their mutual count; open a member with mutuals and confirm the detail page shows compact shared-follower avatars.

## Suggested Review Order

**Discovery contract**

- Builds a capped, public preview while retaining the full shared-follower count.
	[server.js:118](../../../apps/api/server.js#L118)

- Sends enriched profiles through the authenticated discovery endpoint.
	[server.js:1174](../../../apps/api/server.js#L1174)

**Member profile presentation**

- Leaves Community cards count-only and routes selection to the member detail page.
	[app.js:973](../../../apps/web/app.js#L973)

- Renders accessible photo-or-initial mutual previews only after profile selection.
	[app.js:1062](../../../apps/web/app.js#L1062)

- Defines the compact overlapping avatar group for the detail view.
	[styles.css:694](../../../apps/web/styles.css#L694)

**Regression coverage**

- Verifies preview ordering, cap, photo fallback, and aggregate count.
	[health.test.js:44](../../../apps/api/tests/health.test.js#L44)