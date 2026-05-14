# Asset Plan: Permissions Summary

## Global Roles (`global_role`)
| Role | Description | Page Access |
| :--- | :--- | :--- |
| **ADMIN** | System Administrator | All pages, including Admin and Master Data |
| **STORE_CENTER** | Central Procurement | `/store-center`, `/matrix-report`, `/site-plan` (Read) |
| **USER** | Standard User | Base role, depends on Project Roles |

## Project Roles (`role` in `project_roles`)
| Role | Description | Page Access |
| :--- | :--- | :--- |
| **STORE_SITE** | Site Planner | `/site-plan`, `/matrix-report` |
| **PROJECT_MANAGER** | Site Approver | `/site-plan`, `/site-plan/pm-approval`, `/matrix-report` |
| **VIEWER** | Read Only | `/site-plan` (Read Only), `/matrix-report` |

## Page Access Matrix
| Page | Path | Global Role Required | Project Role Required |
| :--- | :--- | :--- | :--- |
| **Home (Portal)** | `/` | All Authenticated | - |
| **Admin: Projects** | `/admin/projects` | `ADMIN` | - |
| **Admin: Users** | `/admin/users` | `ADMIN` | - |
| **Admin: Roles** | `/admin/project-roles` | `ADMIN` | - |
| **Master Data** | `/master-data` | `ADMIN` | - |
| **Store Site Plan** | `/site-plan` | `ADMIN` | `STORE_SITE`, `PM`, `VIEWER` |
| **PM Approval** | `/site-plan/pm-approval` | `ADMIN` | `PROJECT_MANAGER` |
| **Store Center** | `/store-center` | `ADMIN`, `STORE_CENTER` | - |
| **Matrix Report** | `/matrix-report` | All Authenticated | `STORE_SITE`, `PM`, `VIEWER` |
| **Profile** | `/profile` | All Authenticated | - |
