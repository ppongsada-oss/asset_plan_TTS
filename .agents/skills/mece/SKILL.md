---
name: mece
description: Loop Phase 2 — builds a section-based plan that maps 1:1 to target Skill sections[]. Runs once per task. Skipped on resume if plan exists.
---

## Sections
```
- id: 1
  name: "Build Plan"
  steps: ["read target Skill sections[]", "extended reasoning pass (dependency_map + risk_flags)", "map steps to each section", "add verify + rollback per section"]
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
  Tool:     <Bash|Read|Edit|Write — list tools this section uses>
  Constraints: (copy from skill's ##MECE Constraints Block — keep ≤5 most relevant lines)
    - [key constraint from skill]
  Steps:   [A] → [B] → [C]
  Verify:  <checkable — grep/compile/read-back, never subjective>
  Rollback: <what to undo if this section fails>
  Data_Sent: Thai ___ch | ENG: ___ch  ← fill AFTER section completes (leave ___ch at plan creation)
  Token:    ___k                       ← fill AFTER section completes (leave ___k at plan creation)

Section 2 — <name from Skill sections[1]>:
  Skill:    <skill_name>
  Tool:     <Bash|Read|Edit|Write>
  Constraints: (copy from skill's ##MECE Constraints Block)
    - [key constraint from skill]
  Steps:   [D] → [E]
  Verify:  <checkable condition>
  Rollback: <what to undo>
  Data_Sent: Thai ___ch | ENG: ___ch  ← fill AFTER section completes (leave ___ch at plan creation)
  Token:    ___k                       ← fill AFTER section completes (leave ___k at plan creation)

Independent (any section): [X] · [Y]

Cycle grouping (add when plan has ≥ 2 sections):
  Cycle 1: [S1, S2]          ← no mutual dependency (from M1.5 dependency_map[])
  Cycle 2: [S3]              ← depends on output of S1 or S2 · flag from M1.5 risk_flags[] if irreversible
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
  [S1-A.5] REASON — extended reasoning pass across ALL sections (one pass only):
    □ Dependencies: section A output → section B input? → mark Sequential
    □ Parallelizable: sections with no shared state → mark Parallel
    □ Irreversible: any [gate] / delete / DB write? → flag + note scope
    □ Risk surface: which section has highest blast-radius if wrong?
    □ Outcome sketch: "done" per section → feeds S1-C Verify-N criteria
    Budget: ≤600 tokens · working memory only · do NOT write to file
    → result informs: Sequential/Parallel grouping in S1-B + Verify-N in S1-C
  [S1-B] Map MECE steps to each section (use templates below as base)
  [S1-C] Add Verify + Rollback per section
  [S1-D] Copy Constraints: for each section, grep `## MECE Constraints Block` from that section's SKILL.md → paste ≤5 most relevant lines into `Constraints:` field of that section
  [S1-E] Write .sessions/mece_plan.md → validate structure immediately after write:
    grep -cE "^  Constraints:" .sessions/mece_plan.md → must = section count
    grep -c "## Phase 0" .sessions/mece_plan.md → must = 1
    grep -cE "^  Tool:" .sessions/mece_plan.md → must = section count
    FAIL any check → rewrite mece_plan.md to fix missing fields before proceeding to Section 2
  Verify: plan section count = Skill section count · every section has non-empty Constraints: and Tool: fields · Phase 0 block present

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
  Skill:    editor
  Tool:     Bash · Read
  Constraints:
    - [pre-read] T0 lookup → emit [pre-read] · [post-read] verdict · skip = [violation R5/CFP-004]
    - blast radius: check `used_in` in index_variables before any edit decision
  [A] R9 3-checks: error_index → symbol_index → file_index
  [B] Read source at line → confirm symptom
  Verify: blast radius known · ERR candidate confirmed or ruled out
  Rollback: no changes yet
  Data_Sent: Thai ___ch | ENG: ___ch
  Token:    ___k

Section 2 — Edit & Verify:
  Skill:    editor
  Tool:     Edit · Bash
  Constraints:
    - [pre-edit] grep `used_in` → emit [pre-edit] before symbol Edit · skip = [violation R5-edit] · HALT
    - [✓ written] grep verify after Edit · R12: re-read changed section after Edit
    - R14: [gate] before delete/overwrite · R15: [db-gate] for src/db/
  [C] Apply targeted fix
  [D] [✓ written] grep verify change exists
  Verify: grep symptom → 0 results
  Rollback: revert edit
  Data_Sent: Thai ___ch | ENG: ___ch
  Token:    ___k

Section 3 — Sync & Close:
  Skill:    editor
  Tool:     Bash · Edit
  Constraints:
    - R8: `python scripts/symbol_indexer.py` mandatory · ERR-N entry required for every bug fix
    - roadmap `[ ]→[X]` mandatory · [✓ written] verify ERR entry written
  [E] python scripts/symbol_indexer.py
  [F] Write ERR-XXX to error_index.md · [✓ written] verify
  [G] Mark roadmap [X] T-{N}-{BugID} (→ ERR-XXX)
  Verify: ERR entry exists · roadmap [X]
  Rollback: remove ERR entry if incorrect
  Data_Sent: Thai ___ch | ENG: ___ch
  Token:    ___k
```

### New Feature (target: coder)
```
Section 1 — Scope & Index:
  Skill:    coder
  Tool:     Bash
  Constraints:
    - [pre-read] T0 lookup → emit [pre-read] · [post-read] verdict · skip = [violation R5/CFP-004]
    - Roadmap: `[ ] T-N` written before any file creation begins
  [A] R4 scope probe · check index for conflicts
  Verify: no duplicate symbols or file paths
  Rollback: n/a
  Data_Sent: Thai ___ch | ENG: ___ch
  Token:    ___k

Section 2 — Build:
  Skill:    coder
  Tool:     Write · Bash
  Constraints:
    - [✓ written] verify each file after creation — mandatory
    - Do NOT edit index files directly — call `file_manager` + `variable_manager` after
    - Edge Runtime: no Node.js APIs · R15: `src/db/` → [db-gate] → HALT
  [B] Create file(s) · [✓ written] verify each
  Verify: files exist at correct paths
  Rollback: delete created files
  Data_Sent: Thai ___ch | ENG: ___ch
  Token:    ___k

Section 3 — Sync & Close:
  Skill:    file_manager
  Tool:     Bash · Edit
  Constraints:
    - Creation: append to `backlinks[]` of every imported file · `size` object required
    - `python scripts/symbol_indexer.py` mandatory · [✓ written] verify index updated
  [C] file_manager: update index_files.json + backlinks
  [D] variable_manager: update index_variables.json
  [E] python scripts/symbol_indexer.py · Mark roadmap [X]
  Verify: symbol count increased · no stale backlinks
  Rollback: restore index from last known state
  Data_Sent: Thai ___ch | ENG: ___ch
  Token:    ___k
```

### Refactor / Rename (target: editor)
```
Section 1 — Diagnose:
  Skill:    editor
  Tool:     Bash
  Constraints:
    - [pre-read] T0 lookup → emit [pre-read] · [post-read] verdict · skip = [violation R5/CFP-004]
    - blast radius: full `used_in` list required before any rename begins
  [A] grep index_variables → get all used_in files · assess blast radius
  Verify: `grep -c "OldName" knowledge/index_variables.json` ≥ 1 · used_in list complete
  Rollback: n/a (read-only)
  Data_Sent: Thai ___ch | ENG: ___ch
  Token:    ___k

Section 2 — Edit & Verify:
  Skill:    editor
  Tool:     Edit · Bash
  Constraints:
    - [pre-edit] emit before every rename · [✓ written] verify 0 old refs remain
    - R12: re-read each changed call site · R14: [gate] if >5 files affected
  [B] Rename in source · update all used_in call sites
  [C] [✓ written] grep old name → 0 results
  Verify: `grep -rn "OldName" src/ | wc -l` = 0
  Rollback: revert all edited files to pre-task state
  Data_Sent: Thai ___ch | ENG: ___ch
  Token:    ___k

Section 3 — Sync & Close:
  Skill:    variable_manager
  Tool:     Bash · Edit
  Constraints:
    - `python scripts/symbol_indexer.py` mandatory — prevents silent line drift
    - Update JSON key AND verify NewName exists · [✓ written] verify index updated
  [D] python scripts/symbol_indexer.py · update index_variables.json key
  [E] Mark roadmap [X]
  Verify: `grep -c "NewName" knowledge/index_variables.json` ≥ 1 · `grep -c "\[X\] T-<N>" docs/master_roadmap.md` = 1
  Rollback: restore index_variables.json key to OldName
  Data_Sent: Thai ___ch | ENG: ___ch
  Token:    ___k
```

### Multi-skill / Complex Feature (target: agent)
```
Section 1 — Scope & Design:
  Skill:    agent
  Tool:     Bash · Read
  Constraints:
    - Pre-assign ALL T-IDs before any spawn (INVARIANTS.md §I6) · no src/ edit without gather + mece plan
    - [pre-read] T0 lookup → emit [pre-read] · [post-read] verdict · skip = [violation R5/CFP-004]
  [A] R4 scope probe → `find src/ -name "*.ts" | wc -l` (baseline)
  [B] identify which sections need coder vs editor vs file_manager · use M1.5 dependency_map[] → assign Cycle grouping · flag M1.5 risk_flags[] (gate/DB/delete) for user attention at M3
  [C] pre-assign roadmap T-IDs for all sections (INVARIANTS.md §I6)
  Verify: `grep -c "? " .sessions/mece_plan.md` = 0 · no unresolved placeholders
  Rollback: n/a (read-only section)
  Data_Sent: Thai ___ch | ENG: ___ch
  Token:    ___k

Section 2 — Build New Files:
  Skill:    coder
  Tool:     Write · Bash
  Constraints:
    - [✓ written] verify each file created · Do NOT edit indexes directly — call file_manager after
    - Edge Runtime: no Node.js APIs · R15: `src/db/` → [db-gate] → HALT
  [D] create files per spec · [✓ written] verify each
  Verify: `ls src/path/NewFile.tsx 2>/dev/null && echo found` = found
         `grep -c "export default" src/path/NewFile.tsx` = 1
  Rollback: delete created files
  Data_Sent: Thai ___ch | ENG: ___ch
  Token:    ___k

Section 3 — Modify Existing Code:
  Skill:    editor
  Tool:     Edit · Bash
  Constraints:
    - [pre-edit] emit before every symbol Edit · [✓ written] verify · R12: re-read after Edit
    - R14: [gate] before delete/overwrite/batch >5 files · R15: [db-gate] for src/db/
  [E] apply targeted edits to existing files · [✓ written] verify each
  Verify: `grep -c "NewImport" src/path/ExistingFile.ts` ≥ 1
  Rollback: revert edited files
  Data_Sent: Thai ___ch | ENG: ___ch
  Token:    ___k

Section 4 — Sync & Close:
  Skill:    file_manager + variable_manager
  Tool:     Bash · Edit
  Constraints:
    - `backlinks[]` cascade update for all new/removed imports · `size` object required per entry
    - `python scripts/symbol_indexer.py` mandatory · roadmap [X] all T-IDs · [✓ written] verify
  [F] file_manager: update index_files.json + backlinks
  [G] variable_manager: update index_variables.json
  [H] python scripts/symbol_indexer.py · mark roadmap [X] for all T-IDs
  Verify: `python scripts/symbol_indexer.py 2>&1 | grep -c "error"` = 0
         `grep -c "\[X\] T-<N>" docs/master_roadmap.md` = 1 (per section)
  Rollback: restore indexes from pre-task snapshot
  Data_Sent: Thai ___ch | ENG: ___ch
  Token:    ___k

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

## Phase-Checklist Template (write to mece_plan.md at M5)

Every mece_plan.md MUST include Phase 0-3 blocks below. Agent fills `___` values after each tool call.

**~Tok formula (Files Read table):** `EN_ch × 0.3 / 1000` · `TH_ch × 1.7 / 1000` · do NOT use `chars ÷ 1000` (overcounts 3×)
**Pre-fill rule:** Leave ALL `___` placeholders as-is at plan creation — fill only at runtime · never hardcode numeric values (0k, 0ch, etc.) at M5 write

```
## Phase 0 — Boot (once per session · keep [X] on resume · DO NOT reset)
### Files Read
| File | Tool | TH ch | EN ch | ~Tok |
|---|---|---|---|---|
| .sessions/compact_state.md | `cat` (B1: if dt=today → [compact-restore]) | ___ | ___ | ___ |
| .sessions/active_thread.md | `wc -m` + python TH/EN | ___ | ___ | ___ |
| skill-manifest.json (grep) | `grep keywords \| wc -m` (skip if [compact-restore]) | ___ | ___ | ___ |
| .agents/skills/<name>/SKILL.md | `wc -m` + python TH/EN (skip if sk_h match) | ___ | ___ | ___ |
| .agents/skills/mece/SKILL.md (offset=31 limit=110) | `wc -m` + python TH/EN (skip if mece_h match) | ___ | ___ | ___ |
Phase 0 total: TH ___ch · EN ___ch → ~___tok

→ Carry forward: skill_name=___ · CFP_COUNT=___ · task=___

- [ ] B1: compact_state.md checked (dt=today? → [compact-restore]) · active_thread read · SESSION_TOTAL=0/loaded · CFP_COUNT stored
- [ ] B2-B3: [compact-restore] → sk= parsed + sha1 checked · OR manifest grep + SKILL.md read · sections[] loaded
- [ ] C0-C3: routing confirmed · no topic switch
→ TOKEN CHECK (runtime · NOT at plan creation): `printf "SESSION_TOTAL: ___k\n" > .sessions/session_tokens.md` (fill ___k from working memory) · `cat .sessions/session_tokens.md` → ___k

---

## Phase 1 — Info Gather
### Files Read
| File | Tool | TH ch | EN ch | ~Tok |
|---|---|---|---|---|
| <file> | `wc -m` or `grep \| wc -m` | ___ | ___ | ___ |
Phase 1 total: TH ___ch · EN ___ch → ~___tok

- [ ] G1: ALL sections scanned (1 pass)
- [ ] G2: batch greps + targeted reads · [post-read] verdicts emitted
- [ ] G3: every section → file/symbol + Verify-N · [✓ gather] emitted
- [ ] gather_complete.md written today
→ TOKEN CHECK (runtime · NOT at plan creation): `printf "SESSION_TOTAL: ___k\n" > .sessions/session_tokens.md` (fill ___k from working memory) · `cat .sessions/session_tokens.md` → ___k  (>60k → TOKEN PAUSE)

---

## Phase 2 — Plan
### Files Read
| File | Tool | TH ch | EN ch | ~Tok |
|---|---|---|---|---|
| .agents/skills/mece/SKILL.md (offset) | `sed -n 'N,Mp' \| wc -m` | ___ | ___ | ___ |
Phase 2 total: TH ___ch · EN ___ch → ~___tok

- [ ] M1.5: reasoning pass done · dependency_map[] + risk_flags[] in working memory
- [ ] M2: plan 1:1 sections · Skill: + Tool: per section · ≥2 Verify-N
- [ ] M3: user confirmed · M4: roadmap entries written
- [ ] M5: [✓ MECE] emitted · mece_plan.md written today
→ TOKEN CHECK (runtime · NOT at plan creation): `printf "SESSION_TOTAL: ___k\n" > .sessions/session_tokens.md` (fill ___k from working memory) · `cat .sessions/session_tokens.md` → ___k  (>60k → TOKEN PAUSE)
```

**Phase 0 persistence rules:**
- Fresh session → all Phase 0 = [ ]
- Same session, new task → Phase 0 stays [X] · reset Phase 1-3 + remove old sections
- Topic switch → session_manager creates new mece_plan.md → all [ ]
- After /compact (same session): G0 restore — Read `.sessions/session_handoff.md` (Tool: Read) → restore `skill_name + CFP_COUNT + task` → proceed to Phase 1 fresh

**Phase 3 close block (add after Sections + Verify-N):**
```
## Phase 3 — Execute + Close
- [ ] S1 [✓ written] + Verify PASS
      Data_Sent: TH ___ch · EN ___ch
      → TOKEN CHECK (runtime · NOT at plan creation): `printf "SESSION_TOTAL: ___k\n" > .sessions/session_tokens.md` (fill ___k from working memory) · `cat .sessions/session_tokens.md` → ___k
- [ ] S<N> [✓ written] + Verify PASS
      Data_Sent: TH ___ch · EN ___ch
      → TOKEN CHECK (runtime · NOT at plan creation): `printf "SESSION_TOTAL: ___k\n" > .sessions/session_tokens.md` (fill ___k from working memory) · `cat .sessions/session_tokens.md` → ___k
      (>50k → /compact · >60k → TOKEN PAUSE)
- [ ] R8 index sync done (if files/symbols changed)
- [ ] Roadmap [X] all sections annotated
- [ ] active_thread.md → phase: done
- [ ] Write Phase 0 carry-forward → `.sessions/session_handoff.md` (Tool: Write): `skill_name + CFP_COUNT + task` — survives /compact
- [ ] SESSION_TOTAL written: `printf "SESSION_TOTAL: ___k\n" > .sessions/session_tokens.md` (fill ___k from working memory · do NOT hardcode 0k at plan creation)
- [ ] Write compact_state.md (BEFORE /compact — session memory intact) (Tool: Bash): fill dt/sk/sk_h/mece_h/p3 → `.sessions/compact_state.md`
      → Tool MUST be Bash (needs sha1sum + printf — NOT Write tool)
      → format: `dt=<today> s=___k task=___ cfp=___\nsk=___ sk_h=<8chars> mece_h=<8chars>\np1=done p2=done p3=___`
      → see session_manager/SKILL.md §Step 5.3 for exact Bash command · enables B1 [compact-restore] → saves ~2.9k tokens next task
- [ ] /compact — ALWAYS run at task complete (carry-forward written FIRST · prevents next-task context bloat)
      → ✅ เมื่อ compact แล้ว แจ้ง user: "compact เรียบร้อยครับ session ใหม่เริ่มได้เลย ไม่ต้องรัน /compact เอง"
- [ ] [mece-audit] all Verify-N PASS confirmed
- [ ] self_improve: `grep -c "^## CFP-" CODING_FAILURE_PATTERNS.md` → if > boot_count → review
- [ ] harness_doctor: `grep -c "recurred_after_fix" knowledge/index_cfp_fix.json` → if ≥1 → trigger
- [ ] Ask user: "มีอะไรผิดปกติในการทำงานไหมครับ?"
- [ ] Feedback & Error Summary delivered
```

---

## Trace Format
```
**[✓ MECE]**   Plan covers <N> sections in <M> Cycles · user confirmed · roadmap entries added
**[MECE]**     ✓ Section <N> done · → Section <N+1> next
**Token Check — mandatory before starting any new Cycle or Section:**
```
TOKEN CHECK before Cycle/Section N+1:
- Write SESSION_TOTAL (working memory) to file: `printf "SESSION_TOTAL: ___k\n" > .sessions/session_tokens.md` (fill ___k from memory) · then read + verify: `cat .sessions/session_tokens.md`
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
