# Asset Plan Feature / API Matrix

- Date: 2026-06-11
- Purpose: map visible pages and user actions to backend APIs so authorization fixes and bug regression tests can be grouped by feature

## Global Navigation and Session

| Feature | Page / Component | Backing APIs | Audit Focus |
|---|---|---|---|
| Login | `src/app/login/page.tsx`, `src/components/LoginForm.tsx` | `POST /api/auth/login` | credential handling, cookie issuance, weak password hashing |
| Navbar session | `src/components/layout/Navbar.tsx` | `GET /api/auth/me`, `POST /api/auth/logout` | role display, stale session behavior |
| Profile | `src/app/profile/page.tsx` | `GET /api/auth/me`, `PATCH /api/profile` | password change flow, self-service validation |

## Admin

| Feature | Page / Component | Backing APIs | Audit Focus |
|---|---|---|---|
| Projects | `src/app/admin/projects/page.tsx`, `src/components/admin/ProjectManagement.tsx` | `GET/POST/PATCH/DELETE /api/admin/projects` | UI/API role drift, archive and project creation controls |
| Users | `src/app/admin/users/page.tsx` | `GET /api/users`, `POST /api/users`, `PATCH/DELETE /api/users/[id]` | admin-only enforcement, password bootstrap risk |
| Project roles | `src/app/admin/project-roles/page.tsx` | `GET /api/users`, `GET/POST/DELETE /api/projects/roles`, `GET /api/projects` | project-role assignment abuse, hidden privilege escalation |

## Master Data

| Feature | Page / Component | Backing APIs | Audit Focus |
|---|---|---|---|
| Equipment table | `src/app/master-data/page.tsx`, `src/components/master-data/EquipmentTable.tsx` | `GET/POST/PATCH /api/equipment` | master-data CRUD role enforcement |
| Category management | same | `GET/POST/PATCH/DELETE /api/categories` | D1 write reliability, admin-only controls |
| Equipment import | same | `POST /api/equipment/upload`, `GET /api/equipment/template` | bulk overwrite abuse |
| Inventory import | same | `POST /api/inventory/upload?action=parse|clear|insert`, `GET /api/inventory/template` | destructive cycle-wide overwrite |
| Cycle-scoped inventory view | same | `GET /api/center/cycles`, `GET /api/inventory?cycle_id=` | unscoped inventory exposure |

## Store Site

| Feature | Page / Component | Backing APIs | Audit Focus |
|---|---|---|---|
| Site dashboard | `src/app/site-plan/page.tsx`, `src/components/site-plan/SiteJobDashboard.tsx` | `GET /api/site/jobs`, `GET /api/site/jobs?project_id=` | project scoping and status visibility |
| Planning worksheet | `src/app/site-plan/[job_id]/page.tsx`, `src/components/site-plan/PlanningWorksheet.tsx` | `GET /api/equipment`, `GET/POST /api/site/plans`, `GET/POST /api/site/inventory`, `PATCH /api/site/jobs/[id]` | arbitrary `project_id` access, unauthorized job status changes, lock/unlock bypass |

## PM Approval

| Feature | Page / Component | Backing APIs | Audit Focus |
|---|---|---|---|
| PM job list | `src/app/site-plan/pm-approval/page.tsx` | `GET /api/site/jobs` | approval queue scoping |
| PM review detail | `src/app/site-plan/pm-approval/[id]/page.tsx`, `src/components/site-plan/PMReviewTable.tsx` | `GET /api/site/jobs/[id]`, `GET /api/site/plans?job_id=`, `POST /api/pm/plans/save`, `POST /api/pm/jobs/approve`, `POST /api/pm/jobs/reject`, `POST /api/pm/jobs/request-edit` | PM-only enforcement, job-state transitions, edit-after-approve flow |

## Store Center

| Feature | Page / Component | Backing APIs | Audit Focus |
|---|---|---|---|
| Cycle and job management | `src/app/store-center/page.tsx`, `src/components/store-center/JobManagement.tsx` | `GET/POST /api/center/cycles`, `PATCH/DELETE /api/center/cycles/[id]`, `PATCH/DELETE /api/center/jobs/[id]`, `POST /api/center/jobs/revert-approval`, `GET /api/projects` | cycle mutation safeguards, unlock flow, approved-job protections |
| Net demand and decisions | `src/components/store-center/CenterDashboard.tsx` | `GET /api/center/requests?type=DEMAND|RETURN`, `POST/PATCH/DELETE /api/center/decisions`, `GET /api/center/alerts` | stock-affecting actions without role checks, global aggregate exposure |

## Reporting

| Feature | Page / Component | Backing APIs | Audit Focus |
|---|---|---|---|
| Matrix report | `src/app/matrix-report/page.tsx` | `GET /api/reports/matrix` | cross-project reporting exposure, role drift vs documented permissions |

## Hidden / Non-Menu Helpers

| Feature | Route | Audit Focus |
|---|---|---|
| Admin seed helper | `GET /api/auth/seed` | direct privileged account reset |
| Screenshot auth helper | `GET /api/capture-screenshots?action=auth` | session swapping into hardcoded user |
| Temp clear DB helpers | `src/app/api/auth/temp-clear-db/route.ts`, `src/app/api/temp-clear-db/route.ts` | ensure these are disabled or removed from deployable builds |

## Test Priority by Feature

1. Auth helpers and JWT bootstrap
2. PM and Site mutation routes
3. Store Center decision and cycle mutation routes
4. Master-data bulk upload and CRUD
5. Report and aggregate read endpoints
