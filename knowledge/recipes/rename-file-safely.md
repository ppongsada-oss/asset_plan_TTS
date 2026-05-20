---
title: Rename or Move File Safely
cfp_ref: CFP-002
tags: [file, rename, import, recipe]
created: 2026-05-20
---

## When to use
Before renaming, moving, or deleting any file in `src/`.

## Steps
1. `grep -A 5 '"<filepath>"' knowledge/index_files.json` → check `backlinks` array
2. If `backlinks` is non-empty → update all importers first (or use IDE rename)
3. Move/rename the file
4. Run `tsc --noEmit` → confirm no broken imports
5. After done → file_manager skill → R8 Index Sync

## Hard rule
Never assume a file is a leaf node. Always check backlinks before moving.
