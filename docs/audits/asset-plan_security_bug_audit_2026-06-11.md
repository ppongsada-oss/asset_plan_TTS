# Asset Plan Security & Bug Audit

- Date: 2026-06-11
- Scope: `src/app/api/**`, auth/session helpers, role enforcement, workflow mutation routes, import/export, reporting, admin/master-data surfaces
- Coverage summary: 36 API route files, 55 route handlers scanned
- Audit mode: static code review + targeted runtime verification on `localhost:3000`

## Severity Guide

- `Critical`: direct takeover, privilege escalation, or unauthenticated privileged action
- `High`: authenticated privilege bypass, cross-project data exposure, or destructive business-state corruption
- `Medium`: security hardening gap, audit-integrity issue, or bug likely to cause incorrect behavior
- `Low`: code smell, consistency drift, or limited operational risk

## Verification Labels

- `runtime-confirmed`: reproduced against the running app on 2026-06-11
- `code-confirmed`: directly evidenced in current source, but not executed live in this audit pass
- `needs-live-verification`: plausible and evidence-backed, but requires a safer staging workflow or lower-privilege account to reproduce conclusively

## Executive Summary

The current codebase has multiple confirmed authorization gaps. The most serious issue is a public seed endpoint that was reproduced live and reset the admin password to `password123` without authentication. A second helper route was refined by runtime testing: it is not public, but once a request passes middleware it can mint a login cookie for a hardcoded user. The remaining high-risk APIs still rely too heavily on "logged in" middleware rather than enforcing role and project scope inside the handler.

The dominant root cause is architectural: middleware enforces "must be logged in", but many route handlers do not enforce "must have the correct role/scope". As a result, UI restrictions do not guarantee API safety.

## Confirmed Findings

| ID | Verification | Severity | Area | Finding | Evidence |
|---|---|---|---|---|---|
| F-001 | runtime-confirmed | Critical | Auth | Admin seed endpoint is exposed without authorization and can create/reset the hardcoded admin account with a known password. | `src/app/api/auth/seed/route.ts:9-31`; live probe on 2026-06-11 returned `200` and reset admin password |
| F-002 | runtime-confirmed | Critical | Auth | Screenshot helper endpoint is auth-gated by middleware, but once any session reaches it, `?action=auth` can mint a real login cookie for hardcoded user `p.pongsada@gmail.com`. | `src/app/api/capture-screenshots/route.ts:13-53`; live probe on 2026-06-11 returned `307 /login` without cookie and `200` + `Set-Cookie` when authenticated |
| F-003 | code-confirmed | Critical | JWT | JWT signing/verification falls back to a hardcoded secret when `JWT_SECRET_KEY` is missing, enabling token forgery in misconfigured environments. | `src/lib/jwt.ts:3-10`, `src/lib/jwt.ts:27-34` |
| F-004 | code-confirmed | High | Workflow AuthZ | PM edit-request route only checks that a token exists, not that caller is PM/Admin or owns the project/job. | `src/app/api/pm/jobs/request-edit/route.ts:16-30` |
| F-005 | code-confirmed | High | Workflow AuthZ | PM approve route allows any logged-in token holder to approve jobs and mark plans approved. | `src/app/api/pm/jobs/approve/route.ts:18-54` |
| F-006 | code-confirmed | High | Workflow AuthZ | Site plan save route allows any logged-in token holder to replace all plans for any `job_id`/`project_id` pair provided in the request body. | `src/app/api/site/plans/route.ts:99-145` |
| F-007 | code-confirmed | High | Workflow AuthZ | Site job detail route exposes job metadata and allows arbitrary job status mutation without handler-level auth or project-scope validation. | `src/app/api/site/jobs/[id]/route.ts:8-34`, `src/app/api/site/jobs/[id]/route.ts:40-56` |
| F-008 | needs-live-verification | High | Center Decisions | Center decision create/update/delete handlers perform stock-affecting mutations without explicit role checks. Any authenticated session reaching the API can potentially dispatch, receive, reject returns, edit decisions, or delete history. | `src/app/api/center/decisions/route.ts:20-31`, `src/app/api/center/decisions/route.ts:211-257`, `src/app/api/center/decisions/route.ts:264-321`, `src/app/api/center/decisions/route.ts:325-371` |
| F-009 | code-confirmed | High | Audit Trail | Decision audit fields are unreliable because `getUserId()` reads `payload.userId`, but login payloads store `id`. This can write `null` into `action_by`, `created_by`, and `approved_by`. | `src/app/api/center/decisions/route.ts:20-31`, `src/app/api/auth/login/route.ts:36-46` |
| F-010 | code-confirmed | High | Master Data | Equipment CRUD has no handler-level role enforcement. Any logged-in user may be able to read, create, or update equipment master data. | `src/app/api/equipment/route.ts:9-34`, `src/app/api/equipment/route.ts:41-60`, `src/app/api/equipment/route.ts:67-91` |
| F-011 | code-confirmed | High | Master Data | Category/sub-category CRUD has no handler-level role enforcement. Any logged-in user may be able to create, edit, or delete categories. | `src/app/api/categories/route.ts:8-16`, `src/app/api/categories/route.ts:22-40`, `src/app/api/categories/route.ts:48-67`, `src/app/api/categories/route.ts:70-92` |
| F-012 | needs-live-verification | High | Import / Destructive Data | Equipment upload endpoint has no handler-level role enforcement, so any logged-in user may be able to bulk overwrite master equipment data. | `src/app/api/equipment/upload/route.ts:10-164` |
| F-013 | needs-live-verification | High | Import / Destructive Data | Inventory upload endpoint has no handler-level role enforcement and supports `action=clear` and `action=insert`, enabling cycle-wide inventory wipe or bulk replacement by any logged-in user. | `src/app/api/inventory/upload/route.ts:10-64` |
| F-014 | code-confirmed | High | Data Exposure | Matrix report API has no explicit role or project-scope check in the handler and returns cross-project inventory, planning, and decision aggregates. | `src/app/api/reports/matrix/route.ts:8-120`; live probe on 2026-06-11 returned site/warehouse/global project aggregates |
| F-015 | code-confirmed | High | Data Exposure | Center requests API has no explicit role or project-scope check in the handler and assembles cycle-wide demand/return data across projects. | `src/app/api/center/requests/route.ts:26-260`; live probe on 2026-06-11 returned cross-project demand/return rows |
| F-016 | code-confirmed | High | Data Exposure | Alerts API has no explicit role check and reveals global shortage information derived from all approved plans and inventory. | `src/app/api/center/alerts/route.ts:8-81` |
| F-017 | code-confirmed | High | Data Exposure / Mutation | Site inventory API exposes project inventory by arbitrary `project_id` and allows writes without validating caller role or project access. | `src/app/api/site/inventory/route.ts:8-18`, `src/app/api/site/inventory/route.ts:24-52` |
| F-018 | code-confirmed | Medium | Authorization Drift | Admin Projects page is documented as `ADMIN` only, but API `GET` and `PATCH` also allow `STORE_CENTER`, creating UI/API policy drift on project administration. | `docs/permissions_summary.md:21`, `src/app/api/admin/projects/route.ts:18-22`, `src/app/api/admin/projects/route.ts:83-102` |
| F-019 | code-confirmed | Medium | Data Exposure | Generic projects listing endpoint returns all projects with no handler-level role enforcement. This may leak archived/warehouse/site metadata to any logged-in user. | `src/app/api/projects/route.ts:7-13`; live probe on 2026-06-11 returned full project list after authentication |
| F-020 | code-confirmed | Medium | Data Exposure | Cycle inventory endpoint returns all inventory rows for any `cycle_id` with no handler-level role enforcement. | `src/app/api/inventory/route.ts:8-24` |
| F-021 | code-confirmed | Medium | Password Storage | Password hashing uses a static salt plus raw SHA-256, which is too weak for production credential storage. | `src/lib/password.ts:1-13` |
| F-022 | code-confirmed | Medium | Platform Reliability | Categories API uses `onConflictDoNothing()` even though the project rules explicitly warn this can fail silently with Miniflare D1, creating hidden write inconsistencies. | `src/app/api/categories/route.ts:28-37` |

## Runtime Verification Snapshot

- `GET /api/auth/seed` with no cookie returned `200 OK` and reset the seeded admin password to `password123`.
- `GET /api/capture-screenshots?action=auth` with no cookie returned `307 /login`.
- `GET /api/capture-screenshots?action=auth` with a valid session returned `200 OK` and a replacement `token` cookie for `p.pongsada@gmail.com`.
- `POST /api/auth/login` with `admin@tts-construction.com / password123` returned a valid session cookie.
- `GET /api/projects` with a valid session returned the full project catalog, including archived sites and warehouses.
- `GET /api/center/requests?limit=2&type=RETURN` with a valid session returned cross-project planning rows.
- `GET /api/reports/matrix` with a valid session returned site, warehouse, and project-mapping aggregates.

## Priority Fix Order

### Immediate

1. Remove or hard-disable these routes outside a tightly controlled local-dev mode:
   - `src/app/api/auth/seed/route.ts`
   - `src/app/api/capture-screenshots/route.ts`
2. Change JWT bootstrap behavior to fail closed when `JWT_SECRET_KEY` is missing.
3. Replace handler patterns that only do `verifyToken(token)` with role- and scope-aware authorization checks.

### Next

1. Lock down all master-data and import routes to `ADMIN` or `STORE_CENTER` as appropriate.
2. Add project-scope validation for PM and Site mutation routes.
3. Restrict report and center data APIs to approved roles and accessible projects only.
4. Fix audit identity fields in center decisions to use a single canonical token payload shape.

### Hardening

1. Replace password hashing with `bcrypt`, `scrypt`, or `argon2`.
2. Add shared server-side authorization helpers so every route does not reimplement partial checks.
3. Add negative tests:
   - wrong role calling mutation route
   - authenticated user accessing another project's data
   - missing `JWT_SECRET_KEY`
   - helper/debug endpoints disabled in production

## Feature / API Matrix

- Detailed page-to-endpoint mapping is recorded in `docs/audits/asset-plan_feature_api_matrix_2026-06-11.md`.
- Use that matrix when fixing authorization gaps so UI pages, hidden actions, and backend endpoints are corrected together.

## Recommended Remediation Patterns

### 1. Fail closed on auth config

- Do not sign or verify JWTs with fallback secrets.
- Throw startup/runtime errors when `JWT_SECRET_KEY` is absent.

### 2. Centralize authorization

Use one helper for:
- authenticated user required
- allowed global roles
- allowed project roles
- project ownership / project access check

Every mutation route should enforce both:
- `who are you?`
- `why are you allowed to change this specific resource?`

### 3. Separate local tooling from production API surface

Developer-only helpers should be:
- removed from deployed builds, or
- protected by explicit environment flags and a separate secret, not normal app auth

### 4. Add route-level tests for denial cases

The current failures are largely "missing denial-path tests". Add tests that assert:
- `USER` cannot call PM/Center/Admin mutations
- project-scoped users cannot target another `project_id`
- master-data upload routes reject unauthorized callers
- helper routes cannot exist outside explicit local-dev mode

## Remediation Update

### Resolved in current workspace changes

- `resolved`: F-001, F-002, F-003
  - Auth helper routes now fail closed unless explicit unsafe dev flags are enabled.
  - JWT secret fallback was removed; missing `JWT_SECRET_KEY` now fails closed.
- `resolved`: F-004, F-005, F-006, F-007
  - PM and Site workflow mutation/detail routes now enforce `requireProject(...)` against the job's real `project_id`.
- `resolved`: F-008, F-010, F-011, F-012, F-013, F-014, F-015, F-016, F-017, F-019, F-020
  - Center, master-data, upload, report, inventory, and project-listing routes now enforce handler-level auth with `requireRole(...)`, `requireAuth(...)`, or `requireProject(...)`.
- `resolved`: F-009
  - Center decision writes now use the canonical token field `payload.id`, eliminating the prior `payload.userId` drift.
- `resolved`: F-021
  - Password hashing migrated from static-salt SHA-256 to PBKDF2-SHA256 with automatic rehash-on-login for legacy hashes.
- `resolved`: F-022
  - Categories route no longer uses `onConflictDoNothing()` and now performs explicit existence checks before inserts.

### Residual / follow-up

- No open residual findings remain from the remediations completed in this pass.

### Runtime re-verification on 2026-06-11

- `runtime-confirmed`: `GET /api/auth/seed` now returns `404 Not Found` without a session.
- `runtime-confirmed`: `GET /api/capture-screenshots?action=auth` now redirects unauthenticated callers to `/login`, and returns `404 Not Found` even for an authenticated admin session while unsafe helpers are disabled.
- `runtime-confirmed`: `/api/center/requests` now denies a synthetic `USER` token with `403`, while a `STORE_CENTER` token succeeds with `200`.
- `runtime-confirmed`: `/api/equipment` now denies a synthetic `USER` token with `403`, while a `STORE_CENTER` token succeeds with `200`.
- `runtime-confirmed`: `/api/projects` now returns the full catalog for `ADMIN` (`54` projects in the current remote D1 dataset) but only the scoped project for a synthetic site token (`6301` only).
- `runtime-confirmed`: `/api/site/inventory?project_id=6302` and `/api/site/jobs?project_id=6302` now reject a token scoped only to project `6301` via `307` redirect to `/?error=unauthorized_project`.
- `runtime-confirmed`: `/api/site/inventory?project_id=6301` and `/api/site/jobs?project_id=6301` succeed for a token scoped to project `6301`.
- `runtime-confirmed`: `/api/reports/matrix` still responds for scoped non-admin tokens, but the returned project mapping is empty for the synthetic `6301` site token in the current archived-project dataset, which is consistent with the new project filtering behavior.
- `needs-live-verification`: PM mutation allow-paths could not be fully replayed because the current remote dataset returned no planning jobs for projects `6301` and `6302`, so no safe live `job_id` was available for request-edit/approve mutation checks in this pass.

### Runtime re-verification on 2026-06-12

- `runtime-confirmed`: the local environment now uses a non-placeholder `JWT_SECRET_KEY`, so runtime verification is no longer relying on the previous weak development secret.
- `runtime-confirmed`: a synthetic token signed with the old fallback secret is now rejected by middleware and redirected to `/login`, confirming that old fallback-signed JWTs are no longer accepted after the environment secret rotation.
- `runtime-confirmed`: PM mutation routes currently reject a synthetic token with real role value `PROJECT_MANAGER` for project `6701` with `403 Forbidden`.
- `runtime-confirmed`: the same route reaches business-rule validation (`400 Job must be APPROVED`) when given a synthetic token with impossible literal role value `PM`, confirming that the current regression is a role-name mismatch rather than a broader auth failure.

### Runtime re-verification on 2026-06-15

- `resolved`: PM mutation routes now enforce `requireProject(..., ["PROJECT_MANAGER"])`, matching the real project role enum and assigned data.
- `runtime-confirmed`: `POST /api/pm/jobs/request-edit` now succeeds for a synthetic token scoped to project `6701` with role `PROJECT_MANAGER` on `job_id=159`.
- `runtime-confirmed`: the same route still returns `403 Forbidden` for a `VIEWER` token on project `6701` and for a `PROJECT_MANAGER` token scoped to another project.
- `runtime-confirmed`: the same route still returns `400 Job must be APPROVED` for `job_id=192`, confirming the PM allow-path now reaches normal business-rule validation after the auth fix.
- `resolved`: `/api/admin/projects` now enforces `ADMIN` only across `GET`, `POST`, and `PATCH`, matching the documented permission model for the admin projects surface.
- `runtime-confirmed`: `GET /api/admin/projects` now returns `200 OK` for a synthetic `ADMIN` token and `401 Unauthorized` for a synthetic `STORE_CENTER` token.

## Notes

- This report now separates `runtime-confirmed`, `code-confirmed`, and `needs-live-verification` findings.
- The PM role-name regression and the F-018 admin-projects policy drift have now both been fixed and re-verified.
- The dominant risk theme is not cryptography alone; it is authorization drift between UI visibility, middleware login checks, and API handler enforcement.
