# TESTING.md — Per-Action Verification Matrix

> Load-on-demand per CLAUDE.md §R19 Reference Docs. Do NOT load at Boot.

## Verify by Action Type

| Action | Verify steps |
|---|---|
| **New API route** (`app/api/.../route.ts`) | 1. Has `export const runtime = "edge"` · 2. No Node.js imports · 3. Returns `Response` or `NextResponse` · 4. Re-read full file after write |
| **DB read query** | 1. Uses Drizzle query builder · 2. No raw SQL unless necessary · 3. Edge-compatible (no Node.js DB drivers) |
| **DB INSERT** | 1. No `onConflictDoNothing()` → ERR-007 · 2. No multi-row INSERT array syntax → ERR-007 · 3. Single-row INSERT with explicit columns |
| **DB schema change** | 1. Run `npx drizzle-kit generate` to verify · 2. Column/table drops → require I2 gate confirm · 3. Never auto-apply destructive migrations |
| **CSV parsing** | 1. Uses PapaParse only → ERR-008 · 2. Never `split(",")` · 3. Check header row handling |
| **Auth / session** | 1. WebCrypto only — no `bcrypt` (Node), `jsonwebtoken` · 2. Use `jose` or edge-compatible lib · 3. No hardcoded secrets |
| **New component** | 1. Re-read exported types · 2. Trigger `file_manager` to update index · 3. No Node.js APIs |
| **Edit existing component** | 1. Re-read changed section (offset+limit) · 2. Check backlinks via `index_files.json` · 3. Trigger `variable_manager` if symbols changed |
| **Env var access** | 1. Via `process.env` (Cloudflare bindings) · 2. Add to `.dev.vars` for local dev · 3. Never hardcode |

## Post-Edit Checklist (enforces R12)

After every `src/` write:
- [ ] Re-read changed section with offset+limit
- [ ] `grep -A 6 '"path/to/file"' knowledge/index_files.json` → check backlinks
- [ ] Symbols added/removed → trigger `variable_manager`
- [ ] File created/deleted → trigger `file_manager`

## Edge Runtime Restrictions

| Forbidden | Use instead |
|---|---|
| `fs`, `path`, `os` | Cloudflare D1 / KV bindings |
| `crypto.createHash` | `crypto.subtle` (WebCrypto API) |
| `Buffer.from()` | `Uint8Array` / `TextEncoder` |
| `bcrypt` (Node) | WebCrypto only (`crypto.subtle`) — bcryptjs also banned in edge runtime |
| `jsonwebtoken` | `jose` |
| `/tmp/` for staging | `temp/` (project-local only) |
