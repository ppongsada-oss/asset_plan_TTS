# REPO_MAP.md — Repository Structure & Dependency Direction

> Read before editing. Arrows show dependency direction (what depends on what).
> Violating dependency direction = silent runtime breakage.

---

## Layer Diagram

```
src/app/          (Next.js pages + API routes)
    └─ depends on ──→  src/lib/          (business logic, utilities)
    └─ depends on ──→  src/components/   (UI components)
    └─ depends on ──→  src/hooks/        (React hooks)
                            │
                            ▼
                       src/db/           ← PROTECTED ZONE (see INVARIANTS.md I2)
                       ├── index.ts      ← DB connection + query exports
                       └── schema.ts     ← Drizzle schema (single source of truth for DB shape)
                            │
                            ▼
                       knowledge/        ← READ-ONLY at runtime (indexes, not app code)
                       ├── index_files.json      ← file backlinks
                       ├── index_variables.json  ← symbols + line numbers
                       └── error_index.md        ← ERR-XXX error log
```

---

## Directory Reference

| Path | Purpose | Edit Rules |
|---|---|---|
| `src/app/` | Next.js app router pages + API routes | Free to edit; check roadmap first |
| `src/app/api/` | Server-side API endpoints | Gate if changing response shape (other agents may depend) |
| `src/components/` | Shared UI components | Free to edit |
| `src/lib/` | Business logic, helpers, auth | Gate if renaming exported functions (check index_files backlinks) |
| `src/hooks/` | React hooks | Free to edit |
| `src/db/schema.ts` | **Drizzle schema — DB source of truth** | I2 Hard Stop always |
| `src/db/index.ts` | DB connection + query helpers | I2 Hard Stop always |
| `knowledge/` | Symbol + file indexes (read-only) | Never edit manually — regenerate via scripts |
| `docs/` | Roadmap, specs, design docs | Free to edit |
| `scripts/` | Build/indexing scripts | I1 gate if changing indexer logic |
| `db_migrations/` | SQL migration files | I2 Hard Stop always |

---

## Key Dependency Rules

1. **Nothing outside `src/db/` may define DB schema.** Only `src/db/schema.ts` is authoritative.
2. **`knowledge/` is generated, not authored.** Edit via `python scripts/symbol_indexer.py`.
3. **API route response shape changes ripple to frontend.** Check `knowledge/index_files.json` backlinks before changing.
4. **Drizzle types = DB columns.** Renaming a TypeScript interface field in `schema.ts` renames the DB column.

---

## Quick Lookup Commands

```bash
# What files use symbol X?
grep -A 8 '"SymbolName"' knowledge/index_variables.json

# What imports file F?
grep -A 5 '"src/lib/foo.ts"' knowledge/index_files.json

# Current roadmap tasks
grep -E "^\[.\]" docs/master_roadmap.md | tail -20
```
