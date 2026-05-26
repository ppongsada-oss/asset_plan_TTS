---
name: mece
description: Loop Phase 2 — builds a section-based plan that maps 1:1 to target Skill sections[]. Runs once per task. Skipped on resume if plan exists.
---

## Sections
```
- id: 1
  name: "Build Plan"
  steps: ["read target Skill sections[]", "map steps to each section", "add verify + rollback per section"]
- id: 2
  name: "Confirm & Register"
  steps: ["send plan to user", "wait confirm", "add R-Roadmap entry per section"]
```

---

# MECE Planner

## Triggers
- Loop Phase 2: runs after Info Gather Loop for tasks with >3 steps or any side effect
- Side effects: file create/edit/delete · DB write · index update · symbol rename

## Skip When
- Read-only: grep, search, explain, lookup
- Single file edit, backlinks = 0, no ERR documentation needed
- Resuming with existing plan → skip Phase 1+2, jump to Phase 3 at pending section

---

## Plan Format (section-based — must map 1:1 to target Skill sections[])

```
**[✓ MECE]** Goal: <one line>

Section 1 — <name from Skill sections[0]>:
  Skill:    <editor|coder|file_manager|variable_manager|session_manager>
  Steps:   [A] → [B] → [C]
  Verify:  <checkable — grep/compile/read-back, never subjective>
  Rollback: <what to undo if this section fails>

Section 2 — <name from Skill sections[1]>:
  Skill:    <skill_name>
  Steps:   [D] → [E]
  Verify:  <checkable condition>
  Rollback: <what to undo>

Independent (any section): [X] · [Y]

Cycle grouping (add when plan has ≥ 2 sections):
  Cycle 1: [S1, S2]          ← sections with no dependencies between them
  Cycle 2: [S3]              ← depends on output of S1 or S2
  S3 context-input: cycle_1_S1.json, cycle_1_S2.json
  S3 skill: editor            ← declare Skill: for every Cycle N+1 section
```
Rules:
- Sections in the same Cycle are spawned in parallel
- Sections in Cycle N+1 declare which `cycle_N_*.json` files they need
- Single-section plans have no Cycle grouping (omit Cycle block)
```

Rules:
- Sections must match target Skill sections[] exactly (same count and names)
- Each step = 1 atomic action (1 file edit, 1 script run, 1 index update)
- Verify must be executable — never "looks right"
- Independent steps have no section dependency

**Plan size caps (token budget enforcement):**
- Steps: ≤5 items per section
- Verify: ≤2 commands per section (≤60 chars each)
- Rollback: ≤15 words per section
- Total plan: ≤120 lines · if exceeds → consolidate into fewer sections
- Cycle grouping block: ≤10 lines total

**Verify pass criteria (explicit):**
- Pass = command output matches the expected pattern exactly (grep finds target string, exit code = 0, etc.)
- Non-empty output ≠ pass — must match the defined condition
- Ambiguous output (command ran but result is unclear) → treat as FAIL → enter retry flow
- Self-assessed "looks correct" → NOT a valid verify result — must use a checkable command
- If no checkable verify exists for a section → flag at MECE plan creation time, do not leave undefined

**Verify Pattern Lookup — pick by action type (use exact command, not description):**
| Action | Verify command | Pass condition |
|---|---|---|
| Symbol/function created | `grep -c "symbolName" src/path/file.ts` | = 1 |
| Symbol deleted | `grep -c "symbolName" src/path/file.ts` | = 0 |
| Symbol renamed | `grep -rn "OldName" src/ \| wc -l` AND `grep -c "NewName" src/path/file.ts` | = 0 AND ≥ 1 |
| Import added | `grep -c "import.*ModuleName" src/path/file.ts` | ≥ 1 |
| Import removed | `grep -c "import.*ModuleName" src/path/file.ts` | = 0 |
| File created | `ls src/path/file.ts 2>/dev/null && echo found \|\| echo missing` | = found |
| File deleted | `ls src/path/file.ts 2>/dev/null \|\| echo gone` | = gone |
| Build passes | `npm run build 2>&1 \| grep -c "error"` | = 0 |
| Type check | `npx tsc --noEmit 2>&1 \| grep -c "error TS"` | = 0 |
| DB table exists | `wrangler d1 execute DB --local --command "SELECT name FROM sqlite_master WHERE type='table' AND name='tbl'"` | row returned |
| DB row inserted | `wrangler d1 execute DB --local --command "SELECT COUNT(*) FROM table_name"` | count > 0 |
| Index sync | `python scripts/symbol_indexer.py 2>&1 \| grep -c "error"` | = 0 |
| Roadmap marked [X] | `grep -c "\[X\] T-<N>" docs/master_roadmap.md` | = 1 |
| ERR entry written | `grep -c "## ERR-<N>:" knowledge/error_index.md` | = 1 |

---

## Execution Protocol

```
Section 1 — Build Plan:
  [S1-A] Load sections[] from B3 Boot context (already in context window) — re-read .agents/skills/<skill>/SKILL.md only if skill changed since Boot
  [S1-B] Map MECE steps to each section (use templates below as base)
  [S1-C] Add Verify + Rollback per section
  Verify: plan section count = Skill section count

Section 2 — Confirm & Register:
  [S2-A] Send plan to user → wait confirm
         (accept: "ok", "go", "ดำเนิน", "yes", explicit approval)
  [S2-B] Add R-Roadmap entry per section: [ ] T-<N>: <section-name>
  [S2-C] Emit [✓ MECE]
  Verify: roadmap entries exist for all N sections
```

On failure → STOP → report which step failed → do not auto-recover.

---

## Templates by Task Type

### Bug Fix (target: editor)
```
Section 1 — Diagnose:
  [A] R9 3-checks: error_index → symbol_index → file_index
  [B] Read source at line → confirm symptom
  Verify: blast radius known · ERR candidate confirmed or ruled out
  Rollback: no changes yet

Section 2 — Edit & Verify:
  [C] Apply targeted fix
  [D] [✓ written] grep verify change exists
  Verify: grep symptom → 0 results
  Rollback: revert edit

Section 3 — Sync & Close:
  [E] python scripts/symbol_indexer.py
  [F] Write ERR-XXX to error_index.md · [✓ written] verify
  [G] Mark roadmap [X] T-{N}-{BugID} (→ ERR-XXX)
  Verify: ERR entry exists · roadmap [X]
  Rollback: remove ERR entry if incorrect
```

### New Feature (target: coder)
```
Section 1 — Scope & Index:
  [A] R4 scope probe · check index for conflicts
  Verify: no duplicate symbols or file paths
  Rollback: n/a

Section 2 — Build:
  [B] Create file(s) · [✓ written] verify each
  Verify: files exist at correct paths
  Rollback: delete created files

Section 3 — Sync & Close:
  [C] file_manager: update index_files.json + backlinks
  [D] variable_manager: update index_variables.json
  [E] python scripts/symbol_indexer.py · Mark roadmap [X]
  Verify: symbol count increased · no stale backlinks
  Rollback: restore index from last known state
```

### Refactor / Rename (target: editor)
```
Section 1 — Diagnose:
  Skill:    editor
  [A] grep index_variables → get all used_in files · assess blast radius
  Verify: `grep -c "OldName" knowledge/index_variables.json` ≥ 1 · used_in list complete
  Rollback: n/a (read-only)

Section 2 — Edit & Verify:
  Skill:    editor
  [B] Rename in source · update all used_in call sites
  [C] [✓ written] grep old name → 0 results
  Verify: `grep -rn "OldName" src/ | wc -l` = 0
  Rollback: revert all edited files to pre-task state

Section 3 — Sync & Close:
  Skill:    variable_manager
  [D] python scripts/symbol_indexer.py · update index_variables.json key
  [E] Mark roadmap [X]
  Verify: `grep -c "NewName" knowledge/index_variables.json` ≥ 1 · `grep -c "\[X\] T-<N>" docs/master_roadmap.md` = 1
  Rollback: restore index_variables.json key to OldName
```

### Multi-skill / Complex Feature (target: agent)
```
Section 1 — Scope & Design:
  Skill:    agent
  [A] R4 scope probe → `find src/ -name "*.ts" | wc -l` (baseline)
  [B] identify which sections need coder vs editor vs file_manager
  [C] pre-assign roadmap T-IDs for all sections (INVARIANTS.md §I6)
  Verify: `grep -c "? " .sessions/mece_plan.md` = 0 · no unresolved placeholders
  Rollback: n/a (read-only section)

Section 2 — Build New Files:
  Skill:    coder
  [D] create files per spec · [✓ written] verify each
  Verify: `ls src/path/NewFile.tsx 2>/dev/null && echo found` = found
         `grep -c "export default" src/path/NewFile.tsx` = 1
  Rollback: delete created files

Section 3 — Modify Existing Code:
  Skill:    editor
  [E] apply targeted edits to existing files · [✓ written] verify each
  Verify: `grep -c "NewImport" src/path/ExistingFile.ts` ≥ 1
  Rollback: revert edited files

Section 4 — Sync & Close:
  Skill:    file_manager + variable_manager
  [F] file_manager: update index_files.json + backlinks
  [G] variable_manager: update index_variables.json
  [H] python scripts/symbol_indexer.py · mark roadmap [X] for all T-IDs
  Verify: `python scripts/symbol_indexer.py 2>&1 | grep -c "error"` = 0
         `grep -c "\[X\] T-<N>" docs/master_roadmap.md` = 1 (per section)
  Rollback: restore indexes from pre-task snapshot

Cycle grouping:
  Cycle 1: [S1]              ← scope first (serial — establishes T-IDs)
  Cycle 2: [S2, S3]          ← parallel (no mutual dependency)
  Cycle 3: [S4]              ← depends on S2+S3 artifacts
  S2 skill: coder
  S3 skill: editor
  S4 skill: file_manager + variable_manager
  S4 context-input: cycle_2_S2.json, cycle_2_S3.json
```

---

## Trace Format
```
**[✓ MECE]**   Plan covers <N> sections in <M> Cycles · user confirmed · roadmap entries added
**[MECE]**     ✓ Section <N> done · → Section <N+1> next
**Token Check — mandatory before starting any new Cycle or Section:**
```
TOKEN CHECK before Cycle/Section N+1:
- Read SESSION_TOTAL from .sessions/session_tokens.md
- > 50k AND compact not yet run this cycle? → run Mid-Session Compact (see CLAUDE.md R3) → emit [compact] → then proceed
- > 60k? → TOKEN PAUSE immediately (do not start next cycle)
- ≤ 50k? → proceed to next Cycle/Section
```
**[cycle N]**  All <X> sections done · results: .sessions/cycle_N_*.json · spawning Cycle <N+1>
**Final Step — Feedback & Error Summary (MANDATORY before closing task):**
```
1. Error summary: list all steps that were retried, blocked, or degraded during this task
   - Format: "Section <S> step <name>: <what failed> → <how resolved>"
   - If none: "No errors or retries this session"
2. Ask user for feedback:
   "งานเสร็จแล้วครับ ✓
    Errors/retries: <list or 'none'>
    มีส่วนไหนที่ควรปรับปรุงไหมครับ? หรือมี pattern ใหม่ที่ควรเพิ่มใน CODING_FAILURE_PATTERNS.md?"
3. If user identifies a new failure pattern → route to file_manager to add CFP entry
4. Write final summary_context to active session JSON before marking phase: done
```
**[MECE]**     ✓ All Cycles done · Roadmap updated · Thread: done
```
