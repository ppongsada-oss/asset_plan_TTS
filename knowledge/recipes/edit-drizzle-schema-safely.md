---
title: Edit Drizzle Schema Safely
cfp_ref: CFP-001
tags: [drizzle, schema, db, recipe]
created: 2026-05-20
---

## When to use
Before editing any type/interface in `src/db/schema.ts` or related DB types.

## Steps
1. `grep -A 8 '"<SymbolName>"' knowledge/index_variables.json` → check `type` field
2. If `type` is `DrizzleSchema`, `DBColumn`, or `DBTable` → **STOP** → trigger I2 Hard Stop (INVARIANTS.md)
3. If safe to proceed → edit → run `tsc --noEmit` → verify no broken imports
4. After edit → R8 Index Sync (run `python scripts/symbol_indexer.py`)

## Hard rule
Renaming a Drizzle schema field = renaming a DB column. Always requires explicit migration plan.
