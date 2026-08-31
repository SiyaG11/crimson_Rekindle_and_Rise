# Story 3.4: Social Following and Posts

## Status
- Story key: 3-4-social-follower-system
- State: Complete
- Sprint: Sprint 1 - Foundation and Trust
- Priority: P1

## User Story
As a signed-in user, I want to follow people and share separate social posts so I can see follower activity without mixing it into private journal entries.

## Summary of Work Completed
- Added follower and following relationships to the persistence layer.
- Added a separate post model for follower-visible social updates.
- Added authenticated endpoints to follow, unfollow, publish posts, and fetch the social feed.
- Added a dedicated follower posts section in the web app with follow/unfollow actions, feed scope controls, and a post composer.
- Added regression coverage to verify follower posts remain separate from journal entries.

## Files Updated
- apps/api/persistence/store.js
- apps/api/server.js
- apps/api/tests/health.test.js
- apps/web/index.html
- apps/web/app.js
- apps/web/styles.css
- _bmad-output/implementation-artifacts/rekindle-rise/sprint-status.yaml

## Acceptance Criteria Coverage
1. Support following and unfollowing users: complete.
2. Support creating separate social posts: complete.
3. Show follower and following counts in the UI: complete.
4. Render posts independently from journal entries: complete.
5. Allow users to browse follower, following, and combined feeds: complete.

## Verification
- npm run lint: pass
- npm run format:check: pass
- npm test: pass
- npm run ci: pass
- Browser smoke pass for register, follow, post, and feed scope switching: pass
