# Staging Rollback and Incident Response Runbook

## Scope
This runbook defines staging launch-readiness checks, rollback actions, and first-response steps for incidents.

## Pre-Deployment Checklist
1. Confirm latest branch passes `npm run ci`.
2. Confirm environment values are set for staging:
- `NODE_ENV=staging`
- `LOG_LEVEL=info`
- `REQUEST_LOGGING=true`
- `METRICS_ENABLED=true`
- `DATABASE_URL`, `REDIS_URL`, `OBJECT_STORAGE_ENDPOINT`
3. Confirm smoke checks pass against staging URL:
- `STAGING_URL=https://<staging-host> npm run staging:smoke`

## Health and Monitoring Signals
1. Basic health:
- `GET /health`
2. Dependency readiness:
- `GET /health/infrastructure`
- `GET /health/ready`
3. Request telemetry snapshot:
- `GET /health/metrics`
4. Structured request logs:
- Filter records where `type=http_request`
- Alert on elevated `statusCode >= 500`

## Incident Severity Guide
1. Sev-1: Staging unavailable or critical auth/data regression.
2. Sev-2: Major feature degradation with partial workaround.
3. Sev-3: Minor non-blocking issue.

## Immediate Triage Steps
1. Capture current health output:
- `/health`
- `/health/infrastructure`
- `/health/ready`
- `/health/metrics`
2. Check recent structured logs for 4xx/5xx spikes and slow routes.
3. Verify dependencies and credentials:
- database connectivity
- redis connectivity
- object storage endpoint and credentials
4. Re-run smoke checks to confirm blast radius.

## Rollback Procedure
1. Stop active rollout and freeze new deploys.
2. Redeploy the last known-good commit/artifact.
3. Run post-rollback smoke checks:
- `STAGING_URL=https://<staging-host> npm run staging:smoke`
4. Validate core journeys manually:
- register/login
- onboarding
- social feed
- journal create/edit/export
- community/event discovery
5. Document rollback timeline and root-cause hypothesis.

## Exit Criteria
1. Readiness endpoint stable (`/health/ready` expected state).
2. No unresolved Sev-1/Sev-2 conditions.
3. Smoke checks pass and key journey verification completed.
4. Incident notes posted to project log.
