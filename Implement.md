# Implement.md — Agent System Bootstrap & Integration Spec

> **How to use:** Give this file + your repo (zip or path) to any capable AI agent.
> The agent will read this spec and either set up the system from scratch (fresh project)
> or integrate seamlessly into your existing codebase without touching source files.

---

## 1. System Capabilities

This agent management system provides three core capabilities:

| Capability | What it does |
|---|---|
| **Token tracking** | Counts output tokens per session, warns before hitting limits |
| **Session continuity** | Active thread file lets any agent resume mid-task across sessions |
| **File + symbol indexing** | Backlink graph of files and exported symbols — agent looks up before editing |

---

## 2. Required Directory Structure

```
project-root/
│
├── CLAUDE.md                          # Gateway rules — agent reads this first (every session)
│
├── knowledge/
│   ├── index_files.json               # Backlink graph: which files import which
│   ├── index_variables.json           # Symbol index: exported functions/components/types + line numbers
│   └── error_index.md                 # ERR-XXX catalog: known errors + resolutions
│
├── .agents/
│   └── skills/
│       ├── skill-manifest.json        # ★ Machine-readable routing: keywords → skill → context_files (Boot step 5)
│       ├── registry.md                # Human-readable micro-rules + fast-match table (fallback)
│       ├── mece/
│       │   └── SKILL.md               # MECE plan template — auto-loaded before editor/coder
│       ├── coder/
│       │   └── SKILL.md               # Rules for creating new files + Roadmap Protocol
│       ├── editor/
│       │   └── SKILL.md               # Rules for editing existing code + Roadmap Protocol
│       ├── file_manager/
│       │   └── SKILL.md               # Rules for updating index_files.json
│       └── variable_manager/
│           └── SKILL.md               # Rules for updating index_variables.json
│
├── scripts/
│   └── symbol_indexer.py              # Auto-scans src/ and refreshes line numbers in index_variables.json
│
└── .sessions/
    ├── active_thread.md               # 3-line state: task / phase / next
    ├── session_tokens.md              # Cumulative output token counter
    └── session_handoff.md             # Brief written before /clear (optional)
```

> `.sessions/` may be named `memory/` in Claude Code projects — same purpose.

---

## 3. Index Schemas

### 3a. `knowledge/index_files.json`

```json
{
  "files": {
    "src/path/to/file.ts": {
      "description": "One-line summary of what this file does.",
      "associated_tasks": ["T-001", "session_005"],
      "backlinks": [
        "src/path/to/importer-a.ts",
        "src/path/to/importer-b.tsx"
      ]
    }
  }
}
```

- `backlinks`: files that **import** this file (many-to-many)
- `associated_tasks`: task IDs or session IDs that touched this file
- Agent must update backlinks whenever imports change (add/remove)

### 3b. `knowledge/index_variables.json`

```json
{
  "variables": {
    "SymbolName": {
      "type": "ReactComponent | DBTable | Function | Hook | Type | Class | Constant",
      "source": "src/path/to/file.ts",
      "line": 42,
      "fields": ["field1", "field2"],
      "used_in": [
        "src/path/to/consumer-a.tsx",
        "src/path/to/consumer-b.ts"
      ]
    }
  }
}
```

- `line`: must stay current — run `symbol_indexer.py` after any code edit
- `fields`: for DBTable/class only; omit for functions/hooks
- `used_in`: files that call/import this symbol

### 3c. `knowledge/error_index.md` format

```markdown
## ERR-XXX · <Short title>
- **Task:** T-{Parent}-{BugID}-{AttemptID} · **Session:** session_<NNN>
- **File:** src/path/to/file.ts · **Line:** <N>
- **Symptom:** What the error looks like
- **Root Cause:** Why it happens
- **Resolution:** How to fix it
```

> Cross-link rule: roadmap entry must reference `→ ERR-XXX` and error_index entry must reference the Task ID. Both must exist.

---

## 4. CLAUDE.md Gateway Template

Copy this into `CLAUDE.md` at project root. Adjust token thresholds to match your model's context window.

```markdown
# CLAUDE.md — Agent Gateway Rules

> Read first. Hard constraints.

## Boot
1. Check .sessions/active_thread.md → if phase: in_progress → resume; if done/missing → fresh start
2. Check .sessions/session_handoff.md for pending task
3. Read .sessions/session_tokens.md → load SESSION_TOTAL
4. Load .agents/skills/skill-manifest.json → route to correct skill
5. If SESSION_TOTAL >60k → warn user before starting
6. Reply line 1: **[Boot]** Thread · Tasks · Skill · Loaded

---

## R1 · Token Footer (3 Checkpoints)
Append *(Session total: ~NNN tokens | Input+Output)* to every response.
- Formula: Output = (thai_chars × 1.7) + (en_chars × 0.3)
- Input = (user_msg_chars × 0.3) + context_overhead + (tool_result_chars × 0.3)
- **Checkpoint A** (pre-exec): estimate input tokens → log `**[tokens]** Input: ~NNN`
- **Checkpoint B** (post-exec): estimate output so far → log `**[tokens]** Running: ~NNN`
- **Checkpoint C** (final): total turn → add to SESSION_TOTAL → write back → display footer
- Tracks Input+Output combined in SESSION_TOTAL

---

## R2 · Tool Budget
Max 5 tool calls/turn. Retry max 2×.

---

## R3 · Session Token Limit
| SESSION_TOTAL | Action |
|---|---|
| >60k | ⚠️ Warn user |
| >90k | 🛑 HALT → write .sessions/session_handoff.md → tell user to /clear |

---

## R4 · Index-First Lookup
Before editing any file:
- grep knowledge/index_variables.json for symbol → get line → Read with offset+limit
- grep knowledge/index_files.json for file path → check backlinks before changing imports
- NEVER Read full file >80 lines without grep first

---

## R5 · Index Sync (MANDATORY after every file change)
| Event | Action |
|---|---|
| Create/delete/move file | Update knowledge/index_files.json + backlinks |
| Edit file (add/remove imports) | Update backlinks in knowledge/index_files.json |
| Create/delete/rename symbol | Update knowledge/index_variables.json + run python scripts/symbol_indexer.py |
| Edit any symbol body (any code change) | Run python scripts/symbol_indexer.py to refresh line numbers |

---

## R6 · Error Protocol
⚠️ MANDATORY 3-step check before any debug:
1. grep knowledge/error_index.md for symptom keyword
2. grep docs/master_roadmap.md for related task
3. grep knowledge/index_variables.json for affected symbol

New error → Task ID format: `T-{ParentTask}-{BugID}-{AttemptID}` (e.g. `T-004-001-02`)
1. Add `[ ] T-{N}-{BugID}-01: <description>` to roadmap → set `[/]`
2. Fix code
3. Run python scripts/symbol_indexer.py
4. Assign ERR-XXX code
5. Write entry in knowledge/error_index.md (include Task ID + cross-link)
6. Mark roadmap `[X] T-{N}-{BugID}-{Attempt} (→ ERR-XXX)`

---

## R-Roadmap · All work must be logged
Before starting ANY task:
- New feature: `[ ] T-<N>: description`
- Bug fix: `[ ] T-{Parent}-{BugID}-{AttemptID}: description`
- Sub-task: `- [ ] T-<N>.{sub}: description`

Set `[/]` when starting → `[X]` when done.

---

## R7 · Response Density
Default: table/bullet over prose. Comparison → table. Steps → numbered list.
```

---

## 5. Skill Templates

### 5a. `.agents/skills/file_manager/SKILL.md`

```markdown
---
name: File Index Manager
description: Manages file lifecycle and import backlinks in knowledge/index_files.json.
---

## Triggers
1. **Create/edit file with imports** — append this file to the `backlinks` array of every file it imports.
2. **Delete file** — remove its entry AND remove it from all other files' `backlinks` arrays.
3. **Remove import during edit** — remove the backlink from the target file.

## Pre-Analysis
Before any structural change: grep index_files.json for the target path and review all backlinks that may be affected.
```

### 5b. `.agents/skills/variable_manager/SKILL.md`

```markdown
---
name: Variable Index Manager
description: Tracks exported symbols and line numbers in knowledge/index_variables.json.
---

## Triggers
1. **Create any symbol** — Component, function, hook, type, constant, or API logic.
   Add entry: { type, source, line, used_in: [] }
2. **Edit symbol body (any code change)** — run python scripts/symbol_indexer.py to refresh line numbers.
   Line drift is silent and breaks future lookups.
3. **New consumer** — append consumer path to the symbol's used_in array.
4. **Rename** — update JSON key + trace all used_in files to rename call sites.
5. **Delete** — remove entry from JSON.

## Pre-Analysis
Before any refactor: grep index_variables.json for the symbol → read used_in → assess blast radius.
```

### 5c. `.agents/skills/mece/SKILL.md`

```markdown
---
name: MECE Planner
description: Generates MECE plans before any edit/create task with >3 steps or side effects.
---

## Triggers
- Task has >3 steps
- Any irreversible action (file create/delete, import change, DB write, API call)

## Skip
- Read-only tasks
- Single-file edit where backlinks = 0 and no ERR needed

## Plan Format
```
Goal: <what we're achieving>
Sequential: [step1] → [step2] → [step3]
Parallel:   [stepA] + [stepB]
Verify:     <how to confirm success>
```

Send plan to user → wait for confirm → execute one group at a time → verify → proceed.

## Token Checkpoints
- **[tokens] A** — before executing (input estimate)
- **[tokens] B** — after main execution (running total)
- **[tokens] C** — final (write SESSION_TOTAL)

## Trace
`**[MECE]** Plan sent · Groups: N · Waiting confirm`
```

---

### 5d. `.agents/skills/coder/SKILL.md`

```markdown
---
name: Coder (Creator)
description: Focused skill for implementing new features and creating application files.
---

## Roadmap Protocol (MANDATORY — before and after every task)

**Before writing any code:**
1. grep docs/master_roadmap.md for existing task matching this work
   → Found: note Task ID → set status [/]
   → Not found: assign next T-<N> → add `[ ] T-<N>: <description>` to roadmap

**After completing code:**
1. Mark roadmap: `[X] T-<N>: <description> · session_<NNN>`
2. Call file_manager + variable_manager to sync indexes

## Coding Standards
1. Framework conventions: new files in src/app/, src/components/
2. Database integrity: match Drizzle schemas to Technical Requirements Document
3. Self-correction: fix any TypeScript/linter error immediately before finishing
4. Aesthetics: TailwindCSS standard utility classes, minimalist modern enterprise look

## Limitations
- DO update docs/master_roadmap.md — roadmap entries are mandatory
- DO NOT manipulate .agents/ or *.json index files directly — call file_manager + variable_manager after creating files
```

---

### 5e. `.agents/skills/editor/SKILL.md`

```markdown
---
name: Code Editor
description: Focused skill for surgically editing, modifying, and debugging existing code.
---

## Roadmap Protocol (MANDATORY — before and after every edit)

**Before editing:**
1. grep docs/master_roadmap.md for parent task → assign T-{N}-{BugID}-01
   → Add `[ ] T-{N}-{BugID}-01: <description>` to roadmap → set `[/]`
2. Run R6 3-step checks (error_index → roadmap → index_variables) before touching code

**After editing:**
1. Run python scripts/symbol_indexer.py
2. Mark roadmap `[X] T-{N}-{BugID}-{Attempt} (→ ERR-XXX if bug fix)`
3. Call variable_manager if symbol body changed

## Editing Best Practices
1. **Index-first lookup** — grep index_variables.json for symbol → get line → Read offset+limit
2. **Edit targeted** — sed for <5 lines; edit tool with only changed block for more
3. **Never Read full file >80 lines** without finding line number via grep first
4. **Bug fixing** — search error_index.md first; if found apply resolution immediately
```

---

## 6. `scripts/symbol_indexer.py` Spec

If the script does not exist, implement it with this behavior:

```
Input:  Scans all .ts / .tsx files under src/
        Detects lines matching: export (async)? (function|const|let|var|type|interface|class|enum) <Name>
Output: Updates knowledge/index_variables.json
        For each matched symbol: sets "source" and "line" fields
        Does NOT overwrite "type", "fields", or "used_in" — merge only
```

Minimal Python implementation pattern:

```python
import re, json
from pathlib import Path

BASE = Path(__file__).parent.parent
INDEX = BASE / "knowledge/index_variables.json"
EXPORT_RE = re.compile(
    r"^export\s+(?:default\s+)?(?:async\s+)?(?:function|const|let|var|type|interface|class|enum)\s+([A-Za-z_][A-Za-z0-9_]*)"
)

def scan():
    hits = {}
    for f in (BASE / "src").rglob("*.ts"):
        for i, line in enumerate(f.read_text().splitlines(), 1):
            m = EXPORT_RE.match(line.strip())
            if m:
                hits[m.group(1)] = {"source": str(f.relative_to(BASE)), "line": i}
    for f in (BASE / "src").rglob("*.tsx"):
        for i, line in enumerate(f.read_text().splitlines(), 1):
            m = EXPORT_RE.match(line.strip())
            if m:
                hits[m.group(1)] = {"source": str(f.relative_to(BASE)), "line": i}
    return hits

data = json.loads(INDEX.read_text()) if INDEX.exists() else {"variables": {}}
for name, loc in scan().items():
    data["variables"].setdefault(name, {}).update(loc)
INDEX.write_text(json.dumps(data, indent=2, ensure_ascii=False))
print(f"Updated {len(scan())} symbols.")
```

---

## 7. Onboarding Protocol — Fresh Project

Follow these steps in order when setting up on a brand-new project.

```
Step 1: Create directories
  mkdir -p knowledge .agents/skills/file_manager .agents/skills/variable_manager scripts .sessions

Step 2: Write CLAUDE.md
  Use template from Section 4. Adjust R3 token thresholds to your model.

Step 3: Write skill files
  .agents/skills/file_manager/SKILL.md    — Section 5a
  .agents/skills/variable_manager/SKILL.md — Section 5b

Step 4: Initialize indexes
  knowledge/index_files.json     → { "files": {} }
  knowledge/index_variables.json → { "variables": {} }
  knowledge/error_index.md       → # Error Index\n\n(empty)

Step 5: Initialize session state
  .sessions/active_thread.md   → task: init\nphase: done\nnext: none
  .sessions/session_tokens.md  → SESSION_OUTPUT_TOTAL: 0

Step 6: Write symbol_indexer.py
  Use spec from Section 6.

Step 7: Run initial scan
  python scripts/symbol_indexer.py

Step 8: Verify (see Section 9)
```

---

## 8. Integration Protocol — Existing Project (Seamless)

Use this when integrating into an already-developed codebase.
**This protocol never modifies source files** — only adds agent infrastructure.

```
Step 1: Detect project type
  - package.json + "next" → Next.js/TypeScript
  - requirements.txt / pyproject.toml → Python
  - Cargo.toml → Rust
  Adjust scan patterns in Step 4 accordingly.

Step 2: Create agent directories (skip if exist)
  mkdir -p knowledge .agents/skills/file_manager .agents/skills/variable_manager scripts .sessions

Step 3: Write skill + script files
  Same as Onboarding Steps 3 + 6.
  If CLAUDE.md already exists: ADD missing R4 (Index-First), R5 (Index Sync), R6 (Error Protocol) rules only.
  Do NOT overwrite existing CLAUDE.md rules.

Step 4: Build index_files.json from existing codebase
  For each source file (src/**/*.ts, src/**/*.tsx, or equivalent):
    a. Extract description: first JSDoc block comment OR first line comment OR filename-based summary
    b. Extract imports: grep for "import.*from" → resolve relative paths → add THIS file to their backlinks
    c. Write entry: { description, associated_tasks: [], backlinks: [...] }

Step 5: Build index_variables.json from existing codebase
  Run: python scripts/symbol_indexer.py
  Then for each symbol found:
    a. Determine type: Component (PascalCase function returning JSX), Hook (starts with "use"),
       DBTable (drizzle table), Function, Type, Class, Constant
    b. Detect used_in: grep -rl "SymbolName" src/ → filter to files that actually import it
    c. Write entry: { type, source, line, used_in: [...] }

Step 6: Initialize session state
  .sessions/active_thread.md   → task: integration-complete\nphase: done\nnext: none
  .sessions/session_tokens.md  → SESSION_OUTPUT_TOTAL: 0

Step 7: Verify (see Section 9)
```

---

## 9. Verification Checklist

Run after onboarding or integration. All items must pass before starting development work.

```
[ ] knowledge/index_files.json   — exists, valid JSON, "files" key present, entries > 0 for existing projects
[ ] knowledge/index_variables.json — exists, valid JSON, "variables" key present
[ ] knowledge/error_index.md     — exists (may be empty), uses T-{Parent}-{BugID}-{Attempt} format
[ ] .agents/skills/skill-manifest.json — exists, valid JSON, keywords → skill routing defined
[ ] .agents/skills/mece/SKILL.md — exists
[ ] .agents/skills/coder/SKILL.md — exists, contains Roadmap Protocol
[ ] .agents/skills/editor/SKILL.md — exists, contains Roadmap Protocol
[ ] .agents/skills/file_manager/SKILL.md  — exists
[ ] .agents/skills/variable_manager/SKILL.md — exists
[ ] scripts/symbol_indexer.py    — exists, runs without error
[ ] .sessions/active_thread.md   — exists, phase: done
[ ] CLAUDE.md                    — contains R4 (Index-First), R5 (Index Sync), R6 (Error Protocol), R-Roadmap
[ ] python scripts/symbol_indexer.py — exits 0, reports symbol count > 0
```

**Quick verify command:**
```bash
python scripts/symbol_indexer.py && \
python -c "import json; d=json.load(open('knowledge/index_files.json')); print(f'Files: {len(d[\"files\"])}')" && \
python -c "import json; d=json.load(open('knowledge/index_variables.json')); print(f'Symbols: {len(d[\"variables\"])}')"
```

Expected output:
```
Updated NNN symbols.
Files: NNN
Symbols: NNN
```

---

## 10. Quick-Reference Card

Print or paste this card into any agent conversation when starting work:

```
RULES FOR THIS PROJECT:
1. Before editing any file → grep knowledge/ indexes first
2. After every code change → run python scripts/symbol_indexer.py
3. After adding/removing imports → update knowledge/index_files.json backlinks
4. New error → ERR-XXX in knowledge/error_index.md
5. Session end → write .sessions/active_thread.md (phase: done/in_progress)
6. Token footer required every response → read/write .sessions/session_tokens.md
```
