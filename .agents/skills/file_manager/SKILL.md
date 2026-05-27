---
name: File Index Manager
description: Manages the lifecycle of files and their dependencies in knowledge/index_files.json.
---

## Sections
```
- id: 1
  name: "Index Update"
  steps: ["update index_files.json entry", "add/remove backlinks", "[✓ written] verify no stale links"]
```

# File Index Manager

## Triggers & The Many-to-Many Backlink Rule
You must execute your duties on `knowledge/index_files.json` ONLY under these conditions:
1. **Creation & Import Rule**: When creating or editing `File A`, if it imports `File B` and `File C`, you MUST append `File A` into the `backlinks` Array of both `File B` and `File C`. (Remember: One file can act as a backlink for many files safely).
2. **Deletion (Cascading Cleanup)**: When a file is removed:
   - Erase its main entry from the JSON.
   - **Crucial**: You MUST scan the entire JSON and remove the deleted file's path from the `backlinks` Array of EVERY other file that previously referenced it. Do not leave stale links!
3. **Modification**: If an import is removed during editing, reflect that separation by removing the backlink from the target file.

## Entry Format (full structure — all fields required)

```json
"src/path/file.tsx": {
  "description": "<one-line purpose>",
  "associated_tasks": ["T-NNN"],
  "backlinks": ["src/path/importer.ts"],
  "key_sections": [{"name": "FnName", "line": 12, "read_hint": {"offset": 7, "limit": 28}}],
  "keywords": ["keyword1", "keyword2"],
  "size": {
    "lines": 85,
    "th_chars": 0,
    "en_chars": 2340,
    "~tokens": 702
  }
}
```

**`size` field rules:**
- Every entry MUST have a `size` object — agents use it to decide read strategy BEFORE opening a file
- `~tokens = round(th_chars × 1.7 + en_chars × 0.3)`  (Thai ~4× cost vs English)
- **Auto-refresh:** `python scripts/symbol_indexer.py` recomputes all sizes (R8 sync)
- **Manual creation:** compute with one command:
  ```bash
  python3 -c "t=open('<path>').read(); th=sum(1 for c in t if '฀'<=c<='๿'); en=len(t)-th; print(f'lines={t.count(chr(10))+1} th_chars={th} en_chars={en} ~tokens={round(th*1.7+en*0.3)}')"
  ```
- **Agent read strategy from `size`:**
  | `size.lines` | `size.~tokens` | Strategy |
  |---|---|---|
  | ≤ 80 | ≤ 5k | Full Read permitted |
  | > 80 | any | grep first → targeted Read (offset+limit) |
  | any | > 5k | grep first → targeted Read (offset+limit) |

## Pre-Analysis Role
Before the Coder or Editor touches a file, use `Bash: grep` against this index to ensure you understand all `backlinks` that might be affected by the upcoming code change.

---

## MECE Constraints Block (copy into mece_plan.md for sections using `file_manager`)
```
- Creation: append file's path to `backlinks[]` of every file it imports
- Deletion: cascading cleanup — remove from ALL `backlinks[]` across entire index (no stale links)
- Modification: update `backlinks[]` when imports added or removed
- Every entry MUST include `size` object — compute or run `python scripts/symbol_indexer.py`
- [✓ written] grep verify entry + backlinks in `index_files.json` after every change
```
