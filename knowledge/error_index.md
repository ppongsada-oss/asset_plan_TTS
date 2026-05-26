# 🚨 Error Resolution Index (Knowledge Base)

This document collects recurring errors encountered during Asset Plan development, along with proven resolutions. AI agents and developers should search here before debugging any issue.

---

## Entry Template (agent must use this format for every new ERR)

```
## ERR-XXX: <Short title>
- **Task:** T-{ParentTask}-{BugID}-{AttemptID} · **Session:** session_<NNN>
- **File:** src/path/to/file.ts · **Line:** <N>
- **Symptom:** <what the error looks like>
- **Root Cause:** <why it happens>
- **Resolution:** <exact fix applied>

### Failed Approaches:
- [YYYY-MM-DD] T-{N}-{BugID}-01: <approach tried> → verify failed · Reason: <why it didn't resolve>
```

> **Task ID format:** `T-004-001-02` = Task T-004, Bug #1, Attempt #2
> **Cross-link rule:** roadmap `[X] T-004-001-01 (→ ERR-XXX)` ↔ error_index `Task: T-004-001-01`
> **Failed Approaches rule:** Agent MUST append to `### Failed Approaches:` before escalating any blocked fix (R9 + R13).
> Future agents reading this entry MUST check `### Failed Approaches:` before choosing an approach — never repeat a listed approach.

---

## ⚡ LOOKUP TABLE — grep here first (R9 Step 1)

> **R9 Workflow — never Read the full file:**
> 1. `grep -i "<symptom keyword>" knowledge/error_index.md` → match ERR-XXX from table below
> 2. `grep -n "^## .*ERR-XXX" knowledge/error_index.md | head -1` → get exact line N
> 3. `Read knowledge/error_index.md offset=N limit=40` → read that entry only

| ERR | Symptom Keywords |
|-----|-----------------|
| ERR-001 | D1 crash, invalid digit, AppleDouble, `._*` files, Miniflare crash |
| ERR-002 | TypeScript unknown type, `json unknown`, build type error, `res.json()` |
| ERR-003 | `no such table` D1 local, `Failed query`, next-on-pages |
| ERR-004 | `setImmediate`, Edge Runtime, Node.js API not supported |
| ERR-005 | `searchParams` async, Next.js 15, params error |
| ERR-006 | `Unexpected token`, React Fragment, unclosed JSX |
| ERR-007 | Bulk Upload, Multi-Row INSERT, `onConflictDoNothing`, silent fail |
| ERR-008 | CSV parse, Apple Numbers, newlines in quotes, PapaParse |
| ERR-009 | `no such table` new schema, missing migrations, `wrangler migrate` |
| ERR-010 | Element type invalid, mixed imports, named/default import error |
| ERR-011 | `Export db doesn't exist`, Edge Runtime D1, `D1Database` undefined |
| ERR-012 | Navbar duplication, duplicated component, double render |
| ERR-013 | Browser dialog, `confirm`/`alert` blocking, native dialog |
| ERR-014 | Matrix tooltip missing, zero quantity tooltip |
| ERR-015 | Matrix tooltip double counting, pending value wrong |
| ERR-016 | Matrix stale data, cache invalidation failure |
| ERR-017 | Redundant variable, Ecmascript duplicate declaration |
| ERR-018 | `JSON.parse` unexpected character, response not JSON |
| ERR-019 | Session initialization missing, manifest lookup |
| ERR-020 | `TypeError` urgency undefined, `r is undefined` |
| ERR-021 | Store Center reject return, workflow propagation bug |
| ERR-022 | Store Center tab count, badge count mismatch |
| ERR-023 | Matrix row focus, table row focus UX |
| ERR-024 | Store Center hub row tracking, scroll position |
| ERR-025 | Global table focus, keyboard navigation, scroll |
| ERR-026 | Matrix sticky header, z-index alignment, header overlap |
| ERR-027 | Tooltip clipped, `overflow hidden`, card container |
| ERR-028 | Admin seeded wrong role, seeded as USER |
| ERR-029 | Local dev D1 remote, Cloudflare D1 remote connection |
| ERR-030 | Unlock button unexpired, job card unlock, deadline check |
| ERR-031 | Target months hardcoded year, 2026 hardcoded, dynamic months |
| ERR-032 | CSV Catalog Upload, Category Name Override, human-readable Thai names, dictionary mapping |
| ERR-033 | Catalog Upload Button, fileInputRef, missing file input tag, click unresponsive |
| ERR-034 | Catalog Upload Input Tag Hidden inside Modal Block, showUploadModal false, fileInputRef null, unresponsive |
| ERR-035 | CSV Catalog Upload Shifted Columns, subcategory selection missing, upsert upload fix |
| ERR-036 | CSV Catalog Overwrite lack of visibility, missing eq, dry-run modal differences |
| ERR-037 | Add new item button in catalog dropdown inoperative, unified creation mode modal |
| ERR-038 | Overwrite double-submit, loading overlay preview, Next.js fetch cache, no-store |
| ERR-039 | D1 column order mismatch, inventory template headers align |
| ERR-040 | RemoteD1 Database proxy column shifting in raw() mapping |
| ERR-041 | Category & Subcategory popup modals with automatic suggestions, stacked modal overlays |
| ERR-042 | Category & Subcategory soft-delete (archive) and conditional Equipment Item deletion |

---

## 🛑 ERR-001: Cloudflare D1 Local Database Crash (invalid digit found in string)

- **Task:** — · **Session:** —
- **File:** `package.json` · **Line:** scripts.dev
- **Symptom:** Running `npm run dev` crashes immediately in the Miniflare/database layer with `Failed to open database ... invalid digit found in string`.
- **Root Cause:** macOS creates hidden `._*` AppleDouble files (e.g. `._0000_snapshot.json`) in `drizzle/` or `.wrangler/` when the project lives on an ExFAT or network drive. Miniflare tries to parse these filenames as migration version numbers and crashes.
- **Resolution:** Always purge `._*` files before starting the dev server. Permanent fix in `package.json`:
  ```json
  "dev": "find . -type f -name '._*' -delete 2>/dev/null || true; next dev"
  ```
  If the error recurs, run `find . -type f -name "._*" -delete` manually and restart.

---

## 🛑 ERR-002: TypeScript "unknown" Type in Next.js 16 API Fetch

- **Task:** — · **Session:** —
- **File:** src/app/api/\*/route.ts · **Line:** varies
- **Symptom:** `npm run build` fails with `Type error: 'json' is of type 'unknown'.`
- **Root Cause:** Next.js 16 strictly types `await res.json()` and `await request.json()` as `unknown`, blocking property access like `json.success`.
- **Resolution:** Cast to `any` at the point of deserialization:
  ```typescript
  // Backend (route.ts)
  const body = (await request.json()) as any;
  // Frontend fetch
  const json = (await res.json()) as any;
  ```

---

## 🛑 ERR-003: "Failed query: no such table" on Local D1 (next-on-pages)

- **Task:** — · **Session:** —
- **File:** `next.config.ts` · **Line:** setupDevPlatform call
- **Symptom:** API calls return status 500 with `Failed query: select ... from "users" ...` immediately after `npm run dev`.
- **Root Cause:** `setupDevPlatform({ persist: false })` creates a fresh in-memory database on every dev server start, discarding all tables previously stored in `.wrangler/state`.
- **Resolution:**
  1. Change `next.config.ts` to `persist: true`.
  2. Stop the server (Ctrl+C) and restart `npm run dev` so Next.js re-reads the config and connects to the persisted `.wrangler/state`.

---

## 🛑 ERR-004: "A Node.js API is used (setImmediate) which is not supported in the Edge Runtime"

- **Task:** — · **Session:** —
- **File:** src/app/api/auth/\*/route.ts · **Line:** varies
- **Symptom:** Login or seed endpoints return `Invalid credentials` / status 500 with `setImmediate is not supported in the Edge Runtime` in the server console.
- **Root Cause:** `bcryptjs` internally calls `setImmediate`, a Node.js-only API unavailable in Cloudflare Pages / Next.js Edge Runtime.
- **Resolution:** Replace `bcryptjs` with WebCrypto (`crypto.subtle`), which is fully supported on Edge:
  ```typescript
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password + SALT));
  ```

---

## 🛑 ERR-005: Next.js 15 Async searchParams Error

- **Task:** — · **Session:** —
- **File:** src/app/\*/page.tsx · **Line:** varies
- **Symptom:** Pages with `searchParams` throw `searchParams is a Promise and must be unwrapped with await or React.use() before accessing its properties`.
- **Root Cause:** Next.js 15 breaking change: `searchParams` and `params` are now Promises; synchronous access is no longer supported.
- **Resolution:** Declare as `Promise` type and always `await`:
  ```typescript
  export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
    const resolvedParams = await searchParams;
    const id = resolvedParams?.id;
  }
  ```

---

## 🛑 ERR-007: Bulk Upload Equipment — "Failed to process upload" (Miniflare D1 Multi-Row Insert)

- **Task:** — · **Session:** session_023
- **File:** src/app/api/equipment/upload/route.ts · **Line:** varies
- **Symptom:** "Bulk upload" button always shows `Error: Failed to process upload`, regardless of retry count.
- **Root Cause:** Four compounding failures discovered in order:

  | # | Failure Point | Cause |
  |---|---------------|-------|
  | 1 | CSV Parser | Naive `split(",")` breaks on names containing commas (e.g. `"Electric Hoist 1,000 Kg."`) |
  | 2 | `onConflictDoNothing()` | Miniflare D1 local does **not** support `INSERT ... ON CONFLICT DO NOTHING` — fails silently on any conflict |
  | 3 | `buy_price` / `rent_price` | Excel exports decimals (e.g. `8596.03`) but schema declares `integer` — Miniflare D1 enforces this strictly |
  | 4 | Multi-row INSERT | Drizzle D1 Edge Runtime layer does **not** support multi-row INSERT at any batch size — must insert one row at a time |

- **Resolution:**
  1. **CSV parsing** → switch to `papaparse` (`^5.5.3`), which is Edge-compatible and RFC-4180 compliant.
  2. **onConflictDoNothing** → replace with `SELECT existing codes → filter → INSERT only new rows` pattern for all tables.
  3. **Decimal prices** → `Math.round(Number(cols[5]))` for `buy_price` and `rent_price`.
  4. **Multi-row INSERT** → insert one row per iteration: `for (const item of newInserts) { await db.insert(...).values(item); }`

  > **Project-wide rule (Miniflare D1 Local):** Never use multi-row INSERT or `onConflictDoNothing()`. Both fail with a silent "Failed query". Always use SELECT+filter+single-row-insert.

---

## 🛑 ERR-006: React "Unexpected token" (Unclosed Fragment)

- **Task:** — · **Session:** —
- **File:** src/app/\*/page.tsx · **Line:** varies
- **Symptom:** Page crashes with `Unexpected token. Did you mean '{'}'}' or '&rbrace;'?` / `Parsing ecmascript source code failed`.
- **Root Cause:** JSX return statement has an unclosed React Fragment — `<>` opened but `</>` missing.
- **Resolution:** Verify every `<>` has a matching `</>` at the end of the return block:
  ```typescript
  return (
    <>
      <div>...</div>
    </> // required
  );
  ```

---

## 🛑 ERR-008: CSV Parsing Failure on Apple Numbers Exports (Newlines in Quotes)

- **Task:** — · **Session:** —
- **File:** src/app/api/equipment/upload/route.ts · **Line:** varies
- **Symptpt:** Uploading a CSV exported from Apple Numbers or certain Excel versions returns `Failed to process upload` (status 500).
- **Root Cause:** Cells with embedded newlines (Enter key pressed inside a cell) cause `text.split("\n")` to split mid-cell, producing column mismatches that skip or corrupt rows.
- **Resolution:** Replace all custom CSV splitting with `PapaParse`:
  1. Run `npm install papaparse --legacy-peer-deps`
  2. Use in `route.ts`:
  ```typescript
  import Papa from "papaparse";
  const parsed = Papa.parse(text, { header: false, skipEmptyLines: true });
  const rows = parsed.data as string[][];
  ```
  `Papa.parse` correctly handles quoted newlines and embedded commas per RFC-4180.

---

## 🛑 ERR-009: "no such table" or Failed Insert on New Schema Tables (Missing Local Migrations)

- **Task:** — · **Session:** —
- **File:** src/db/schema.ts + local D1 state · **Line:** varies
- **Symptom:** After adding a new table to `schema.ts`, API calls return status 500 with `no such table: <table_name>`.
- **Root Cause:** `schema.ts` was updated but migration files were never generated and applied to the local D1 database, leaving the actual DB schema out of sync with the code.
- **Resolution:**
  1. Generate the migration: `npx drizzle-kit generate`
  2. Apply to local DB:
     ```bash
     npx wrangler d1 execute <db-name> --local --command="CREATE TABLE ..."
     ```
  3. Going forward, run `npx drizzle-kit push` (if config supports it) or ensure migrations are applied after every schema change.

---

## 🛑 ERR-010: "Element type is invalid" Runtime Error (Mixed Named/Default Imports)

- **Task:** — · **Session:** —
- **File:** src/app/\*/page.tsx · **Line:** varies
- **Symptom:** Page crashes at runtime with `Element type is invalid: expected a string or class/function but got: undefined. You likely forgot to export your component or mixed up default and named imports.`
- **Root Cause:** Component exported as a named export (`export function MyComponent`) but imported as a default import (`import MyComponent from "..."`), or vice versa, resulting in `undefined`.
- **Resolution:** Match export style to import style exactly:
  1. Named export → `import { Navbar } from "@/components/layout/Navbar";` (with braces)
  2. Default export → `import ProjectManagement from "@/components/admin/ProjectManagement";` (no braces)

---

## 🛑 ERR-011: "Export db doesn't exist" (Edge Runtime D1 Connection)

- **Task:** — · **Session:** —
- **File:** src/db/index.ts · **Line:** varies
- **Symptom:** `The export db was not found in module [project]/src/db/index.ts. Did you mean to import getDb?`
- **Root Cause:** In a Cloudflare D1 + next-on-pages project, a global `db` instance cannot exist because the D1 binding is only available per-request via the Edge Runtime `env` context.
- **Resolution:** Never `import { db }` directly. Use `getDb` with `getRequestContext()`:
  1. Set `export const runtime = "edge";`
  2. Import:
     ```typescript
     import { getDb } from "@/db";
     import { getRequestContext } from "@cloudflare/next-on-pages";
     ```
  3. Instantiate per-request:
     ```typescript
     const env = getRequestContext().env;
     const db = getDb(env as any);
     ```

---

## 🛑 ERR-012: Duplicated UI Components (Navbar Duplication)

- **Task:** — · **Session:** —
- **File:** src/app/layout.tsx + src/app/\*/page.tsx · **Line:** varies
- **Symptom:** Navbar renders twice (stacked or doubled), making the header appear abnormally thick or showing duplicate logos.
- **Root Cause:** `<Navbar />` is placed in both `src/app/layout.tsx` (global) and a specific `page.tsx`. Next.js App Router wraps every page with its layout, so the component renders twice.
- **Resolution:**
  1. Keep `<Navbar />` only in `src/app/layout.tsx`.
  2. Remove the `import { Navbar }` and `<Navbar />` from any `page.tsx` that also appears in the layout.

---

## 🛑 ERR-013: Browser Native Dialogs (confirm/alert) Blocking in Next.js Event Handlers

- **Task:** — · **Session:** —
- **File:** varies · **Line:** varies
- **Symptom:** Clicking a button that calls `window.confirm()` or `confirm()` causes the UI to silently freeze — no dialog appears and no subsequent code runs. No console error is shown. Common in Firefox or when `backdrop-blur` + fixed overlays are present.
- **Root Cause:** Some browsers block synchronous native dialogs from async event handlers or scripts they consider intrusive. Fixed overlays with `backdrop-blur` can also trap focus, causing the native dialog to be hidden or immediately dismissed.
- **Resolution:** Never use `window.confirm()` or `alert()` for critical actions. Replace with a custom React confirmation modal or a state-based UI confirmation to ensure cross-browser compatibility and no main-thread blocking.

---

## 🛑 ERR-014: Matrix Report Tooltip Missing on Zero Quantities

- **Task:** — · **Session:** —
- **File:** src/app/api/reports/matrix/route.ts + src/components/matrix/BreakdownTooltip.tsx · **Line:** varies
- **Symptom:** Hovering over "Pending Demand" or "Pending Return" columns shows no tooltip when the pending count is 0 (green), even though actions were taken on that row.
- **Root Cause:** (1) The API only included `details` when `qty > 0`; once a row was fully handled, no detail array was sent. (2) `<BreakdownTooltip />` had an early return `if (items.length === 0) return null`, so zero-item responses produced no tooltip at all.
- **Resolution:** Update `src/app/api/reports/matrix/route.ts` to always return project detail records even when pending is 0, computing: Pending Demand = `Original Demand - Supplied`; Pending Return = `Original Excess - Received - Rejected`. Update the frontend to render zero values in a muted color (slate-500) so users can still see action history in the tooltip.

---

## 🛑 ERR-015: Matrix Report Tooltip Double Counting (Wrong Pending Value)

- **Task:** — · **Session:** —
- **File:** src/app/api/reports/matrix/route.ts · **Line:** varies
- **Symptom:** The pending demand tooltip shows a non-zero pending value even when `Required` and `Supplied` are equal (e.g. both 3), and status incorrectly shows "Waiting".
- **Root Cause:** Baseline Adjustment Error — the API subtracted `projectTotalSupplied` from `currentInv` before calculating `originalNetGap`. Since `currentInv` is a stable snapshot baseline that should not be adjusted by current-cycle actions, this subtraction inflated the starting demand (double counting), producing a wrong pending value.
- **Resolution:** In `src/app/api/reports/matrix/route.ts`, use `currentInv` as the raw baseline without applying any action adjustments to it. Calculate `Pending = OriginalGap - HandledActions` directly.

---

## 🛑 ERR-016: Matrix Report Stale Data (Cache Invalidation Failure)

- **Task:** — · **Session:** —
- **File:** src/app/api/center/decisions/route.ts, src/app/api/pm/jobs/approve/route.ts, src/app/api/site/plans/route.ts · **Line:** varies
- **Symptom:** After a Store Center Hub decision (purchase, rent, dispatch) or PM approval, the Matrix Report page does not update — stale data persists for up to 5 minutes or indefinitely.
- **Root Cause:** (1) The decisions API invalidated a hardcoded cache key `"matrix_report"` while the Matrix Report API used dynamic keys like `matrix_report_v3_c1_...` — these never matched. (2) PM Approval and Site Planning endpoints had no cache invalidation for the matrix report at all.
- **Resolution:** In all three mutation endpoints, replace key-specific deletion with prefix-based deletion: `kv.list({ prefix: "matrix_report_v3_" })` → delete all matching keys. Apply to:
  1. `src/app/api/center/decisions/route.ts` (POST and DELETE)
  2. `src/app/api/pm/jobs/approve/route.ts`
  3. `src/app/api/site/plans/route.ts`

---

## 🛑 ERR-017: Redundant Variable Definition (Ecmascript file error)

- **Task:** — · **Session:** —
- **File:** src/app/api/\*/route.ts · **Line:** varies
- **Symptom:** Build or runtime log shows `the name 'searchParams' is defined multiple times` / `Ecmascript file had an error`.
- **Root Cause:** The same variable name is declared more than once in the same scope, typically from copy-paste or repeated edits to a function.
- **Resolution:**
  1. Check the top of the function for an existing `const { searchParams } = ...` declaration.
  2. Remove the duplicate, or alias it: `const { searchParams: sp } = ...`.
  3. Ensure no same-named variable exists in any nested scope of the same function.

---

## 🛑 ERR-018: JSON.parse: unexpected character at line 1 column 1

- **Task:** — · **Session:** —
- **File:** varies (client-side fetch) · **Line:** varies
- **Symptom:** Browser console shows `SyntaxError: JSON.parse: unexpected character at line 1 column 1` when a client fetch tries to parse the API response as JSON.
- **Root Cause:** (1) The API path does not exist (404 returns an HTML error page). (2) A runtime error (500) returns a text stack trace instead of JSON. (3) Wrong API path prefix (e.g. calling `/api/cycles` instead of `/api/center/cycles`).
- **Resolution:**
  1. Check the Network tab to inspect the actual status code and response body.
  2. Verify the API path in code matches a real route under `src/app/api/...`.
  3. Guard every fetch before calling `.json()`:
  ```javascript
  const res = await fetch(url);
  if (!res.ok) throw new Error("API status: " + res.status);
  const json = await res.json();
  ```

---

## 🛑 ERR-019: Missing Session Initialization & Manifest Lookup

- **Task:** T-019-ERR-01 · **Session:** session_054
- **File:** .agents/skills/session_manager/SKILL.md · **Line:** 22
- **Symptom:** Agent starts a new feature or refactoring task without creating a new session file or reading the skill manifest, leading to missing operational logs.
- **Root Cause:** Prioritizing task-specific info gathering (Phase 1) while bypassing the mandatory Boot Sequence (B2) and Session Rotation protocol.
- **Resolution:** Strictly enforce the Boot Sequence. Before any Phase 1 activity on a new topic, perform a Manifest lookup and execute Session Rotation (creating a new `.sessions/session_xxx.json`) as mandated by the project governance.

---

## 🛑 ERR-020: TypeError: can't access property "urgency", r is undefined

- **Task:** T-020-ERR-01 · **Session:** session_055
- **File:** src/hooks/use-requests.ts · **Line:** 28
- **Symptom:** CenterDashboard freezes with `can't access property "urgency", r is undefined` when loading request data.
- **Root Cause:** The `useCenterRequests` hook used `flatMap` to merge paginated pages without checking for undefined pages (e.g. on API error or empty result), allowing `undefined` entries into the `requests` array. When UI mapped over the array and accessed `.urgency`, it crashed.
- **Resolution:**
  1. Fix the hook in `src/hooks/use-requests.ts` to filter undefined entries: `.flatMap((page) => page?.data || []).filter(Boolean)`
  2. Add optional chaining in `src/components/store-center/CenterDashboard.tsx` at every property access (`r?.urgency`) to prevent crashes on incomplete data.
  - **Attempt 2 update:** Also refactored the API SQL join (was too strict — excluded requests without a `job_id` or outside the selected cycle). Switched to a broader query with JavaScript-level filtering for accuracy.

---

## 🛑 ERR-021: Store Center Reject Return Propagation Bug

- **Task:** T-011-001-01 · **Session:** session_057
- **File:** src/app/api/center/decisions/route.ts
- **Symptom:** Rejecting a return in month N causes already-handled months (N+1 onward) to re-appear as new pending returns.
- **Root Cause:** The API only updated `required_qty` for the month where the rejection occurred. Because Asset Plan is a continuous timeline, a delta between month N and N+1 caused the `requests` API to treat the gap as a new phantom return.
- **Resolution:** Update the Decisions API (POST and DELETE) to propagate `required_qty` changes to the current month and **all future months** for the same project and equipment, maintaining timeline continuity.

---

## 🛑 ERR-022: Store Center Tab Count Mismatch

- **Task:** T-011-002-01 · **Session:** session_055
- **File:** src/app/api/center/requests/route.ts
- **Symptom:** Tab badges in Store Center Hub (New Demand / Expected Returns) show "0" for the non-active tab, or reset to "0" when switching tabs.
- **Root Cause:** The API filtered by type (demand or return) before computing totals, so the returned array only contained one type and the UI counted the other as 0.
- **Resolution:**
  1. In `src/app/api/center/requests/route.ts`, compute counts for both types after applying search/cycle filters but **before** type-based pagination filtering.
  2. Return `counts: { demand, return }` in the JSON response.
  3. Update `useCenterRequests` to expose `counts`, and update `CenterDashboard.tsx` to use these API-provided counts instead of self-counting from the `requests` array.

---

## 🛑 ERR-023: Matrix Report Row Focusing UX Issue

- **Task:** T-015.2 · **Session:** session_055
- **File:** src/app/matrix-report/page.tsx · **Line:** 513
- **Symptom:** When scrolling a long matrix table, users cannot easily identify which row they are on.
- **Root Cause:** No row number column existed, making it hard to reference or track a specific row while scrolling.
- **Resolution:** Add a sticky running-number column (#) at the leftmost position (`sticky left-0`) so the row index remains visible even when scrolling right.

---

## 🛑 ERR-024: Store Center Hub Row Tracking UX Issue

- **Task:** T-011.1 · **Session:** session_056
- **File:** src/components/store-center/CenterDashboard.tsx · **Line:** 486
- **Symptom:** Users have difficulty tracking which row they are working on when the request list is long.
- **Root Cause:** No row-number indicator in the main table, making row reference difficult during scrolling.
- **Resolution:** Add a # column immediately after the checkbox column in the CenterDashboard main table, using the map index as the row number for clear positional reference.

---

## 🛑 ERR-025: Global Table Focus & Navigation Issue

- **Task:** T-011.2, T-011.3 · **Session:** session_056
- **Files:** src/components/site-plan/PMReviewTable.tsx, src/components/site-plan/PlanningWorksheet.tsx
- **Symptom:** Users lose track of row position while reviewing or planning large equipment lists.
- **Root Cause:** No sticky running-number (#) column — when scrolling right or down, users cannot identify which row they are editing.
- **Resolution:** Add a sticky (#) column (`sticky left-0`) to both PM Review Table and Planning Worksheet. Also make the equipment name column sticky at `left-[40px]` with a subtle shadow to visually separate the frozen columns from the scrollable data area.

---

## 🛑 ERR-026: Matrix Report Sticky Header Alignment & Layering

- **Task:** T-015-001-03 · **Session:** session_057
- **File:** src/app/matrix-report/page.tsx · **Line:** 411
- **Symptom:** Matrix Report table headers render incorrectly when scrolling — row 1 and row 2 headers overlap, or a white gap appears between header rows.
- **Root Cause:** (1) Hardcoded `top-[68px]` for the second header row did not match the actual rendered height of the first header row. (2) `z-index` values were not layered hierarchically, causing sticky columns to bleed through headers or headers to overlap each other.
- **Resolution:**
  1. **Z-Index Layering:** Intersection cell (top-left) = `z-[100]`, top headers = `z-[50]`, second headers = `z-[40]`, body sticky cells = `z-[30]`.
  2. **Top Offset:** Use `40px` and enforce first-row height with `h-[40px]` for precision.
  3. **Sub-pixel Gap Fix:** Overlap the second sticky column over the first by 1px (`left-[49px]` over a `w-[50px]` cell) with an inner `div` locking the width, preventing browser sub-pixel rounding from creating white seams.
  4. **Visual Depth:** Use `shadow-[1px_0_0_0_#e2e8f0]` instead of `border-r` so dividers are always exactly 1px and do not affect box model calculations.

---

## 🛑 ERR-027: Tooltip Clipped by Card Container (Overflow Issue)

- **Task:** T-038-001-01 · **Session:** session_059
- **File:** src/components/admin/ProjectManagement.tsx · **Line:** 154
- **Symptom:** Equipment list tooltip in the Admin Projects page is clipped by the card border and cannot render outside the card boundaries.
- **Root Cause:** The card container has `overflow-hidden`, which clips any absolutely positioned child (including tooltips) that extends beyond the card's bounds.
- **Resolution:** Remove `overflow-hidden` from the card container and add `hover:z-20` so the hovered card rises above sibling cards, allowing the tooltip to render fully without clipping.

---

## 🛑 ERR-028: Local Admin Account Seeded with Incorrect Role (Seeded as USER)

- **Task:** T-005-001-01 · **Session:** session_065
- **File:** src/app/api/auth/seed/route.ts · **Line:** 22
- **Symptom:** Logging in with the default admin account (`admin@tts-construction.com` / `password123`) shows no admin menus — only the regular site view.
- **Root Cause:** The `/api/auth/seed` API updates only `password_hash` when the user already exists in the database. It never forces `global_role` back to `ADMIN`, so if the account exists with role `USER`, it stays `USER` after every seed run.
- **Resolution:** Update `/api/auth/seed` to always set `global_role: "ADMIN"` alongside `password_hash` during the update step, ensuring the seeded account always has admin rights after seeding.

---

## 🛑 ERR-029: Local Development Isolated from Cloudflare D1 Remote Database

- **Task:** T-002-002-01 · **Session:** session_066
- **File:** src/db/index.ts · **Line:** 8
- **Symptom:** `npm run dev` connects to an empty local Miniflare SQLite DB instead of the real Cloudflare D1 remote database. Real user accounts (e.g. `admin@tts-construction.com`) cannot be used locally. Adding `--remote` to Wrangler does not help because the next-on-pages dev platform does not support remote D1 binding in local dev mode.
- **Root Cause:** `setupDevPlatform` (next-on-pages) only emulates D1 locally with an in-memory/local SQLite — it has no mechanism to read/write real Cloudflare D1 via the binding API in local development mode.
- **Resolution:** Create a `RemoteD1Database` proxy class in `src/db/index.ts` that implements the `D1Database` interface. When `process.env.NODE_ENV === 'development'` and Cloudflare credentials are present in `.env.local`, it translates all Drizzle SQL queries into direct calls to the Cloudflare D1 HTTP REST API (`/accounts/{account_id}/d1/database/{database_uuid}/query`), making local dev instantly sync with the remote D1 database.

---

## 🛑 ERR-030: Unlock Button Rendered on Unexpired Planning Job Cards

- **Task:** T-056.1-BUG-01 · **Session:** session_072_unlock_job_cards
- **File:** src/components/store-center/JobManagement.tsx · **Line:** 401
- **Symptom:** The "Unlock" button appears and is clickable on all job cycle cards, including those whose deadline has not yet passed (no locking should have occurred yet).
- **Root Cause:** Browsers configured with the Buddhist Era calendar (e.g. Safari on macOS/iOS with Thai locale) return `new Date().getFullYear()` as a Buddhist year (e.g. 2569). The `isDeadlinePassed` comparison then evaluates `"2569-05-22" > "2026-05-31"` as `true`, incorrectly treating all cards as expired and rendering the unlock button on every card.
- **Resolution:**
  1. Fix `getLocalGregorianString` in `src/lib/date-utils.ts` to always format dates using `Intl.DateTimeFormat("en-US", { calendar: "gregory", year: "numeric", month: "2-digit", day: "2-digit" })`, forcing Gregorian dates regardless of the user's system calendar.
  2. Disable the unlock button when `!isUnlockedState && !isDeadlinePassed(cycle.end_date)`.
  3. Show a days-remaining badge (green: "X days until lock", orange: "Last day before lock") when the deadline has not passed.

---

## 🛑 ERR-031: Target Months in Job Creation Limited to Hardcoded Year (2026)

- **Task:** T-056-002-01 · **Session:** session_073_dynamic_months
- **File:** src/components/store-center/JobManagement.tsx · **Line:** 33
- **Symptom:** The "Create New Job Cycle" screen only shows target month buttons for 2026 (`2026-01` through `2026-12`), making it impossible to create job cycles for future years (e.g. 2027).
- **Root Cause:** `AVAILABLE_MONTHS` was a hardcoded string array fixed to 2026, with no mechanism to switch years or select months from other years.
- **Resolution:**
  1. Add a Year Selector dropdown that displays both Gregorian (AD) and Buddhist Era (BE) year labels.
  2. Derive the current year using `getLocalGregorianString(new Date())` to avoid Buddhist calendar contamination (per CFP-007).
  3. Render the 12 month buttons dynamically for whichever year is selected.
  4. Add a Selected Months Summary badge strip so users can see and edit cross-year month selections at a glance.

---

## 🛑 ERR-032: CSV Catalog Upload Category Name Override

- **Task:** T-077-002-01 · **Session:** session_077_category_preview
- **File:** src/app/api/equipment/upload/route.ts · **Line:** 60-65
- **Symptom:** Re-uploading `equipment_import.csv` overwrites the human-readable Thai names of categories and subcategories in the database with their alphanumeric codes (e.g., "A", "A1").
- **Root Cause:** The catalog CSV file lacks column fields for human-readable category/subcategory names. The upload API endpoint defaults to setting `name = code` when creating or mapping unique categories/subcategories.
- **Resolution:** Defined static lookup dictionaries (`CATEGORY_NAMES` and `SUBCATEGORY_NAMES`) mapping category and subcategory codes to their correct Thai names, and used them to set the correct human-readable names during row processing inside the upload API.

---

## 🛑 ERR-033: Catalog Upload Button Unresponsive

- **Task:** T-077-003-01 · **Session:** session_077_category_preview
- **File:** src/components/master-data/EquipmentTable.tsx · **Line:** 848
- **Symptom:** Clicking the "อัปโหลด Catalog (CSV)" dropdown action does not trigger the file picker and nothing happens on the screen.
- **Root Cause:** The `fileInputRef` state ref was declared and referenced by the trigger button's onClick function, but the `<input type="file" ref={fileInputRef} ... />` tag was never rendered in the React JSX tree, leading to a silent failure.
- **Resolution:** Rendered the missing `<input type="file" ref={fileInputRef} accept=".csv" className="hidden" onChange={handleFileUpload} />` element in the component's JSX layout.

---

## 🛑 ERR-034: Catalog Upload Input Tag Hidden inside Modal Block

- **Task:** T-077-003-02 · **Session:** session_077_category_preview (Attempt 2)
- **File:** src/components/master-data/EquipmentTable.tsx · **Line:** 848 / 1086
- **Symptom:** Clicking the "อัปโหลด Catalog (CSV)" dropdown action does not trigger the file picker and nothing happens on the screen.
- **Root Cause:** In the previous fix, the missing `<input>` tag was added inside the `{showUploadModal && (...)` conditional block. Because `showUploadModal` is `false` by default, the file input tag is not rendered in the DOM, making `fileInputRef.current` null and the button click unresponsive.
- **Resolution:** Moved both hidden `<input>` tags for CSV catalog upload and Excel inventory upload outside of the conditional modal block to the root of the component's returned JSX so that they are always mounted and accessible.

---

## 🛑 ERR-035: CSV Catalog Upload Shifted Columns & Missing Subcategory Selection

- **Task:** T-077-004-01 · **Session:** session_077_category_preview (Attempt 2)
- **File:** src/app/api/equipment/upload/route.ts · **Line:** 151-176
- **Symptom:** In the Edit Equipment modal, the "Sub-Category (หมวดย่อย)" dropdown remains blank/shows `-- เลือก --` for certain items, even though the category is selected correctly. Also, in the background table, columns under the item name are shifted (e.g. displaying subcategory code and unit where category and subcategory belong).
- **Root Cause:** A buggy legacy parser split rows containing commas in their name fields inappropriately, shifting subsequent columns (saving `"PCS"` into `sub_category_code` and `"B20"` into `category_code`). Because `"PCS"` is not a valid subcategory of category `"B"`, the select box was unable to find a matching option and fell back to `-- เลือก --`. Furthermore, because the upload API was "insert only" (skipping items with existing `item_code`), re-uploading the corrected CSV was unable to overwrite/correct these corrupted database entries.
- **Resolution:** Modified the Catalog CSV upload API route to perform a robust Upsert operation. It now updates existing items (matching by `item_code`) with the corrected columns from the CSV and inserts only new ones, enabling users to re-upload and seamlessly repair any historically corrupted database entries.

---

## 🛑 ERR-036: CSV Catalog Upload Overwrite Lack of Visibility & Missing `eq` Import

- **Task:** T-077-004-02 · **Session:** session_077_category_preview (Attempt 2)
- **File:** src/app/api/equipment/upload/route.ts, src/components/master-data/EquipmentTable.tsx
- **Symptom:** Compilation error due to missing `eq` import in the upload route API, and a lack of data visibility/warning when uploading corrected CSV data since the system would overwrite existing items immediately without letting the user see what is different or giving them options to overwrite/skip.
- **Root Cause:** 1) Drizzle's `eq` operator was added to the DB join and update queries in the upload route but was not imported. 2) The frontend uploaded files directly to the API without first validating differences via dry-run or providing interactive confirmation options.
- **Resolution:** 1) Added `import { eq } from "drizzle-orm"` in the API upload route. 2) Redesigned the frontend upload flow to first execute a dry-run check (`?dry_run=true`). If modifications are found, it opens a highly polished glassmorphic custom comparison modal displaying summary cards and a scrollable side-by-side list of specific differences (`old ➡️ new`). 3) Enabled selective write operations by providing options to "เขียนทับข้อมูลเดิมทั้งหมด (Overwrite)" or "นำเข้าเฉพาะของใหม่เท่านั้น (Skip & Insert New)" to protect data integrity.

---

## 🛑 ERR-037: '+ เพิ่มรายการใหม่' Button in Catalog Dropdown Menu Inoperative

- **Task:** T-055.4 · **Session:** session_079_t055_ui_dropdown
- **File:** src/components/master-data/EquipmentTable.tsx · **Line:** 625 / 830
- **Symptom:** In the Equipment Master Data page, clicking the "+ เพิ่มรายการใหม่" (Add new item) action button inside the Catalog vertical dropdown menu closes the dropdown menu but does not open the item creation modal, making it impossible to register single items manually through the UI.
- **Root Cause:** The onClick handler of the "+ เพิ่มรายการใหม่" button was hardcoded to run `setActiveMenu(null)`, which closes the dropdown list but does not set any state to trigger the modal. The edit/creation modal itself only opened when `editItem` was non-null, and was hardcoded to act as an edit-only form (disabling the `item_code` field and using PUT requests).
- **Resolution:** 1) Integrated creation mode into the existing Edit modal. If `editItem.id === 0`, it switches the modal to Creation Mode, changing the title to "เพิ่มอุปกรณ์ใหม่ (Create Equipment)", enabling the `item_code` input field, and submitting via a POST request to `/api/equipment` instead of PUT. 2) Updated the "+ เพิ่มรายการใหม่" dropdown action button onClick handler to call `setEditItem` with a default empty equipment object (id: 0, empty string fields, etc.), opening the unified modal in Creation Mode.

---

## 🛑 ERR-038: Overwrite Button Double-submit and Next.js Fetch Caching

- **Task:** T-077-005-01 · **Session:** session_080
- **File:** src/components/master-data/EquipmentTable.tsx · **Line:** 98, 102, 1192, 1206, 1293, 1301, 1311
- **Symptom:** In the CSV Import Comparison Modal, clicking the "เขียนทับข้อมูลทั้งหมด (Overwrite)" button performs the upload but does not show a loading UI, allowing users to click repeatedly (double-submit). Additionally, once the upload completes, the master data table does not refresh with updated values, displaying stale cached results.
- **Root Cause:** 1) The modal lacked a loading overlay and failed to disable interactive buttons (Close, Cancel, Skip, Overwrite) while the upload state `uploading` was active. 2) Next.js route caching aggressively cached the GET requests to `/api/equipment` and `/api/categories` inside `fetchData()`, returning cached stale data instead of requesting fresh values.
- **Resolution:** 1) Added `relative` positioning class to the preview modal container card and embedded the absolute `<LoadingOverlay />` component controlled by the `uploading` state. 2) Applied `disabled={uploading}` and opacity styles to the modal close, cancel, and import buttons. 3) Added the `{ cache: "no-store" }` options header to the `/api/equipment` and `/api/categories` fetch calls to bypass Next.js GET caching and enforce fresh data retrievals.

---

## 🛑 ERR-039: D1 Database Schema Variable Column Order Mismatch

- **Task:** T-077-006-01 · **Session:** session_081
- **File:** `src/db/schema.ts` · **Line:** 66
- **Symptom:** Discrepancy between Drizzle-defined schema column order and the actual Cloudflare D1 local/production SQLite database, which could lead to column mismatches or migration failures. Additionally, the Excel inventory template headers did not align with DB schema column names.
- **Root Cause:** Columns added to tables later via migrations (`ALTER TABLE`) exist at the end of the SQLite database tables (e.g. `cycle_id` in `project_inventory` is the last column, `qty` in `center_decisions` is the last column, and `is_unlocked`/`updated_at` in `planning_jobs` are at the end after `created_at`). However, `src/db/schema.ts` defined them in a different logical order. Furthermore, the Excel template used custom names (`LocationCode`, `ItemMetaCode`, `QTYLine`) instead of the DB columns (`project_id`, `item_code`, `qty`).
- **Resolution:**
  1. Aligned the Drizzle schema definitions in `src/db/schema.ts` to match the exact column order of D1 SQLite database tables.
  2. Updated `src/app/api/inventory/template/route.ts` to use `project_id`, `item_code`, `qty`, `description` as Excel template headers.
  3. Modified `src/app/api/inventory/upload/route.ts` to support both the database-aligned headers and the legacy headers for backwards-compatibility.

---

## 🛑 ERR-040: RemoteD1 Database Proxy Column Shifting in raw() Mapping

- **Task:** T-077-006-02 · **Session:** session_082
- **File:** `src/db/index.ts` · **Line:** 65 / 90
- **Symptom:** In local development, the equipment edit modal (or pages using database joins like LEFT JOIN) displays incorrect/shifted data values (e.g. subcategory name showing in item name, unit showing `0`, rent price showing `129` when it is actually `0`).
- **Root Cause:** Next.js development server is configured with `CLOUDFLARE_D1_API_TOKEN` which uses `RemoteD1Database` to connect to the remote production D1 database. The class's `.raw()` method was using the `/query` endpoint, which returns rows as JSON objects. For queries containing joined tables with duplicate column names (like `name` in `equipment_items`, `categories`, and `sub_categories`), duplicate keys clash and overwrite each other, returning fewer keys than selected columns. Converting this object back to an array using `Object.keys()` resulted in a truncated array of values which Drizzle incorrectly mapped by index, causing column shifting.
- **Resolution:** Re-implemented the `.raw()` proxy method in `RemoteD1Database` (both in `prepare` and `prepareWithParams`) to call the Cloudflare D1 REST API `/raw` endpoint, which natively executes SQLite queries and returns raw row arrays of values alongside a list of column names, avoiding key collisions and ensuring exact index mapping alignment for Drizzle.

---

## 🛑 ERR-041: Category & Subcategory Creation Popup Modals in Master Data Preview

- **Task:** T-077-007-01 · **Session:** session_077_category_preview
- **File:** `src/components/master-data/EquipmentTable.tsx` · **Line:** 62, 329, 1179, 1192-1320
- **Symptom:** When clicking "เพิ่มหมวดหลัก" or "เพิ่มหมวดย่อย" inside the Category & Subcategory Preview modal, the user is redirected away or the modal is closed to switch to the "CATEGORY" tab, which breaks the workspace context and requires extra navigation steps.
- **Root Cause:** Main and subcategory creation was only designed to work on the "CATEGORY" tab interface, causing actions triggered from within the preview modal (which shows category/subcategory lists) to either be unavailable or disrupt the preview flow.
- **Resolution:** Created dedicated, stacked `AddCategoryModal` and `AddSubCategoryModal` overlay popups with a high z-index (`z-[60]`) and backdrop blur. Handled local state to auto-suggest the next category code (using alphabetical sequence) and next subcategory code (using numerical increment based on parent category code). Closed modals and refreshed categories data upon successful submission without closing the underlying preview modal or changing the active tab.

---

## 🛑 ERR-042: Category & Subcategory Archiving and Conditional Equipment Item Deletion

- **Task:** T-077-008-01 · **Session:** session_083_t077_popup_modals
- **File:** `src/db/schema.ts`, `src/app/api/categories/route.ts`, `src/app/api/equipment/route.ts`, `src/components/master-data/EquipmentListTable.tsx`, `src/components/master-data/EquipmentTable.tsx` · **Line:** varies
- **Symptom:** Categories and subcategories could only be hard-deleted, which triggers D1 database foreign key constraint failures if they are associated with existing equipment. Equipment items were not deletable at all from the UI.
- **Root Cause:** 1) Missing status columns and archive workflow for categories/subcategories to preserve historical references. 2) Missing delete endpoint and verification logic to ensure equipment is only deleted when it has no planning cycles or stock inventory records.
- **Resolution:** 
  1. Modified `src/db/schema.ts` and `schema.sql` to add a `status` column (`ACTIVE` / `ARCHIVED`) to `categories` and `sub_categories` tables.
  2. Updated the DELETE handler in `/api/categories` to soft-delete categories/subcategories (changing status to `ARCHIVED`) and cascade the status update to child subcategories.
  3. Added subqueries in GET `/api/equipment` to compute `is_deletable` boolean based on plan and inventory counts, and implemented DELETE `/api/equipment` endpoint with reference double-checks.
  4. Rendered a conditional "Delete" button in `EquipmentListTable` and integrated deletion handlers in `EquipmentTable`.
