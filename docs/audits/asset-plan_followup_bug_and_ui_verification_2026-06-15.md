# Asset Plan Follow-up Bug & UI Verification

- Date: 2026-06-15
- Scope:
  - Follow-up note for currently open bug/risk items
  - Local UI smoke verification on `http://localhost:3000`
- Verification mode:
  - Static code review for remaining fix items
  - Runtime verification with local dev server + Playwright (headless)
- Auth context used for UI verification:
  - `ADMIN` session via `admin@tts-construction.com`

## Remediation Status

| ID | Severity | Area | Status | Evidence |
|---|---|---|---|---|
| R-001 | High | AuthZ freshness | Fixed on 2026-06-15. JWT is now identity-only and auth checks re-load current role/project access from the database. | `src/app/api/auth/login/route.ts`, `src/lib/auth-check.ts`, `src/app/page.tsx`, `src/app/site-plan/page.tsx`, `src/middleware.ts` |
| R-002 | High | Unsafe helper design | Fixed on 2026-06-15. The seed helper no longer mutates through `GET` and no longer returns internal error details. | `src/app/api/auth/seed/route.ts` |
| R-003 | Medium | Sensitive logging | Fixed on 2026-06-15. Raw D1 API payload logging was removed from the remote adapter. | `src/db/index.ts` |
| R-004 | Medium | Data integrity | Fixed on 2026-06-15. Site-plan replace flow now validates inputs and restores the prior snapshot if re-insert fails. | `src/app/api/site/plans/route.ts` |

## Regression Note

- During remediation, `src/app/api/admin/projects/route.ts` was re-checked because older runtime evidence in the repo showed prior API drift.
- Current repo policy remains `ADMIN` only for `/admin/projects`, so the final route stays `ADMIN` only.

## UI Smoke Verification

### Environment

- Dev server: `npm run dev`
- Base URL: `http://localhost:3000`
- Browser automation: Python `playwright`
- Test style: non-destructive smoke checks only
  - page load
  - authenticated navigation
  - modal open/close
  - filter/tab interaction
- No destructive submit actions were executed.

### Results

| Area | Result | Notes |
|---|---|---|
| Login page | Pass | `/login` loaded and rendered email/password fields |
| API login | Pass | `POST /api/auth/login` returned `200` and valid session for admin test account |
| Admin Users page | Pass | `/admin/users` loaded successfully |
| Add User action | Pass | `Add User` button opened modal overlay; follow-up probe confirmed additional email input + overlay |
| Admin Projects page | Pass | `/admin/projects` loaded successfully |
| Add Project action | Pass | Add Project modal opened successfully |
| Add Project modal close | Pass with note | Modal did not close via `Escape` in probe, but did close via `ยกเลิก/Cancel` |
| Project filter action | Pass | Site filter tab/button was present and clickable |
| Project Roles page | Pass | `/admin/project-roles` loaded with table content |
| Profile page | Pass | `/profile` loaded with form controls present |
| Master Data page | Pass | `/master-data` loaded with buttons/tables and no captured runtime errors |
| Store Center page | Pass | `/store-center` loaded and rendered expected content markers |
| Matrix Report page | Pass | `/matrix-report` loaded and rendered table/report markers |
| Site Plan page | Pass | `/site-plan` loaded and rendered expected content markers |
| PM Approval page | Pass | `/site-plan/pm-approval` loaded and rendered expected content markers |

### Runtime Notes

- No page errors were captured during the successful smoke passes above.
- No browser console errors were captured on the pages that completed.
- The initial `Add User` modal check was a false negative from an overly strict probe. A follow-up probe confirmed the modal actually opens.
- The only UX quirk observed in this pass was keyboard close behavior on the Add Project modal:
  - `Escape` did not dismiss the modal in the probe
  - `ยกเลิก/Cancel` dismissed it correctly

## Current Follow-up Focus

1. Extend post-fix runtime verification beyond the `ADMIN` role to cover `STORE_CENTER` and project-scoped site users.
2. Add targeted automated coverage for auth freshness and site-plan rollback behavior so these fixes are regression-tested without relying only on manual smoke checks.

## Regression Entry Points Added

- Automated auth freshness coverage now lives in `tests/auth/auth-freshness.test.ts` and runs via `npm run test:auth`.
- Automated rollback safety coverage now lives in `tests/site-plans/rollback-safety.test.ts` and runs via `npm run test:rollback`.
- Combined automated coverage runs via `npm run test:unit`.
- Localhost role-policy smoke coverage now lives in `scripts/runtime-access-regression.ts` and runs via `npm run test:runtime`.
- The runtime smoke defaults to the seeded `admin@asset.com`, `center@asset.com`, and `site@asset.com` accounts from `scripts/seed.ts`, with env overrides available through `TEST_*` variables.

## Verification Limits

- This pass verified the UI as `ADMIN` only.
- This pass did not execute destructive submits such as delete, archive, import clear/replace, or approval mutations.
- This pass is a smoke test, not a full end-to-end business workflow replay with seeded scenario data for every role.
