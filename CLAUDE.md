# CLAUDE.md — Hard Constraints & Gateway

> Read first. Every AI agent, no exceptions. Rules here = hard constraints.

## Boot (3 tool calls max)
```
[B1] Bash: (phase=$(grep "^phase:" .sessions/active_thread.md 2>/dev/null | awk '{print $2}'); [ "$phase" != "in_progress" ] && printf "SESSION_TOTAL: 0\n" > .sessions/session_tokens.md; cat .sessions/active_thread.md 2>/dev/null | tail -4; echo "---"; cat .sessions/session_tokens.md 2>/dev/null; echo "---"; grep -n "\[/\]" docs/master_roadmap.md 2>/dev/null | head -3)
[B2] Read: .agents/skills/skill-manifest.json → match user intent to keywords[] → identify skill_name
[B3] Read: .agents/skills/<skill_name>/SKILL.md → load sections[] and context_files
```
→ B1 auto-resets SESSION_TOTAL to 0 when phase ≠ in_progress (new session guard — runs before read)
→ Load SESSION_TOTAL from B1 into working memory (no further file reads for tokens this session)
→ If SESSION_TOTAL > 60k → warn user immediately before proceeding

Reply line 1 — Boot trace:
```
**[Boot]** Thread: <done|in_progress> · Tasks: <N open> · Skill: `<name>` · Sections: <N> · Tokens: ~<N>k
```

Mid-task trace — emit on routing/protocol decisions only:
```
**[→ skill]**   Match: `<keyword>` → `<skill>` · Loaded: `<files>`
**[R9]**        Search: `<keyword>` → <ERR-XXX found: applying | not found: new ERR>
**[R8]**        Event: <edit|create|delete> · Running: symbol_indexer.py
**[index]**     Lookup: `<Symbol>` → line <N> · used_in: <N files>
**[tokens]**    Input est: ~NNN · Output est: ~NNN · Running: ~NNk
**[MECE]**      ✓ Section <N> done · → Section <N+1> next | ✓ All done · Thread: done
```

Gate-confirmation trace — emit after each gate check (required, not optional):
```
**[✓ gather]**  Context sufficient after <N> reads · proceeding to MECE
**[✓ MECE]**    Plan covers <N> sections · user confirmed · roadmap entries added
**[✓ R9]**      3-checks: error_index ✓ · symbol_index ✓ · file_index ✓ → proceeding
**[✓ written]** grep `<key>` in `<file>` → found line <N> ✓
**[loop]**      Section <S>/<N> · step `<name>` → <execute|verify|done>
**[blocked]**   Section <S> `<step>` failed 2× → reason: `<cause>` · waiting for user
**[pause]**     SESSION ~<N>k > 60k · done: <X>/<N> sections · saving state · asking user
**[resume]**    Config reloaded · MECE: <reused|rebuilt> · resuming section <N>
```

After any task → write `.sessions/active_thread.md`:
```
task: <what was done>
phase: <done | in_progress | blocked>
next: <next action if any>
```

---

## Per-Turn Routing Check (every user message — before any work)

Boot selects a skill for the FIRST task only. Every new user message requires a fresh intent check.

```
[C1] Read user message → extract intent keywords
[C2] Match keywords against skill-manifest.json skills[].keywords
[C3] Does matched skill == currently loaded skill?
      ├─ Yes → continue. No re-read needed. Emit nothing.
      └─ No  → Read .agents/skills/<new_skill>/SKILL.md
               Emit: **[→ skill]** Match: `<keyword>` → `<new_skill>` · Loaded: `<sections>`
               Replace loaded skill in working memory → proceed with new skill
```

**Same session ≠ same skill.** A session can span multiple tasks — each task routes to its own skill.

| Situation | Action |
|---|---|
| User asks to fix a bug (was doing session work) | Re-route → `editor` |
| User says "ปิด session" (was editing code) | Re-route → `session_manager` |
| User asks to create a new file (was debugging) | Re-route → `coder` |
| User continues same task, same type of work | Stay on current skill |

Do NOT "stay in editor mode" across topic changes. Do NOT rationalize skipping re-route because "it's the same session".

---

## Loop Architecture — All Work Runs Through 3 Phases

**Phases 1–2 run ONCE per task.** On resume: skip to Phase 3 at pending section.

---

### Phase 1 · Info Gather Loop

Goal: gather enough context to cover all Skill sections before planning.

```
GATHER LOOP (repeat until context_sufficient):
│
│   [G1] Identify: what is still missing to plan all Skill sections?
│   [G2] Retrieve: R5 index-first → grep index → targeted read (never full file)
│   [G3] Assess: sufficient to plan MECE for all sections?
│        ├─ No  → loop back to G1
│        └─ Yes → Emit [✓ gather] → EXIT to Phase 2
│
└─ Token check each iteration: SESSION_TOTAL > 60k → PAUSE (R3)
```

---

### Phase 2 · MECE Plan (once — skip if existing plan on resume)

```
[M1] Load: .agents/skills/mece/SKILL.md
[M2] Build: plan covering ALL sections defined in Skill (must map 1:1, not generic)
[M2.5] DoD: for each section, define ≥1 runnable verify command or measurable success criterion
        Format: Verify-<N>: `<command>` → expected: <output or condition>
        Examples: `grep -c "export default" src/app/page.tsx` → 1
                  `wrangler d1 execute --command "SELECT COUNT(*) FROM equipment"` → row count > 0
                  `npm run build` → exit 0
[M3] Send plan + DoD (Verify-<N> for each section) to user → wait confirm
     User must confirm BOTH plan steps AND verify criteria before proceeding
[M4] R-Roadmap: add entry for each section [ ] T-<N>: <section-name>
[M5] Emit [✓ MECE]
```

MECE runs ONCE. On resume: load existing plan from session → jump to pending section.

---

### Phase 3 · Execution Loop

```
SECTION LOOP (section = 1 → N per MECE plan):
│
│   REACT LOOP (repeat until section_complete OR token pause):
│   │   Token check: SESSION_TOTAL > 60k → finish current step → PAUSE
│   │
│   │   [L1] SELECT  → next tool for current step     (R2 budget · R5 index-first)
│   │   [L2] EXECUTE → run tool                       (R6 output filter · R10 tool cap)
│   │   [L3] OBSERVE → verify result correctness
│   │                  unexpected → diagnose → retry once → still wrong → BLOCKED
│   │   [L4] VERIFY  → (a) write/edit → grep confirm → Emit [✓ written]
│   │                      not found → retry once → still missing → BLOCKED
│   │                  (b) run section's Verify-<N> defined in Phase 2 DoD
│   │                      PASS → section_done eligible
│   │                      FAIL → do NOT mark section done → diagnose → retry or BLOCKED
│   │   [L5] DECIDE
│   │        ├─ section steps remain? → Emit [loop] · continue REACT LOOP
│   │        └─ section done?         → Emit [loop] done · exit REACT LOOP
│   │
│   END REACT LOOP
│   → Write .sessions/session_handoff.md:
│        sections_done: [list] · sections_pending: [list]
│        last_step: <name> · latest_result: <summary>
│
│   BLOCKED?
│   → halt remaining sections
│   → show: error detail + completed steps + pending steps
│   → Ask user: "แก้ก่อนดำเนินการต่อ หรือ skip section นี้?"
│   → Wait for user decision
│
│   TOKEN PAUSE? (R3)
│   → save state: sections_done[] · sections_pending[] · last_step
│   → show progress summary
│   → Ask user: "ดำเนินการต่อไหมครับ?"
│   → On confirm: reload config · MECE reuse if unchanged, rebuild if changed
│                 reset to pending section · open REACT LOOP
│
└─ Continue to next section (Config stays loaded — no reload unless resuming)
```

---

### Completion Gate

Agent may NOT report done until all pass:
```
□ All N Skill sections executed (tool calls — not just described in text)
□ Every write/edit has [✓ written] grep verification
□ R8 Index Sync done (if files/symbols changed)
□ R-Roadmap entries → [X]
□ active_thread.md → phase: done
□ SESSION_TOTAL written → .sessions/session_tokens.md
```
→ Any box unchecked → continue Phase 3 · never report done prematurely

---

## R1 · Token Tracking

Read session_tokens.md ONCE at Boot (B1) → SESSION_TOTAL in working memory.
No per-turn file reads. Estimate in memory each turn:
```
Input  = (user_msg_chars × 0.3) + context_overhead + (tool_result_chars × 0.3)
Output = (thai_chars × 1.7) + (en_chars × 0.3)
context_overhead: Turn 1 = ~4,000 | subsequent = 200 + (SESSION_TOTAL × 0.08)
```
Write to file ONLY at: token pause · blocked halt · completion gate
Emit [tokens] trace before response · append footer every response: `*(Session total: ~NNN tokens)*`

---

## R2 · Tool Budget
Max 5 tool calls/turn. Retry max 2×; diagnose on 2nd fail.

---

## R3 · Session Pause Protocol
| SESSION_TOTAL | Action |
|---|---|
| >60k | finish current loop step → TOKEN PAUSE in Phase 3 |
| >90k | HALT immediately → save state → report to user |

Single-response spike (output >3k): deliver first, then append warning.
→ Details: `.agents/skills/token_tracker/SKILL.md`, `.agents/skills/session_manager/SKILL.md`

---

## R4 · Sub-agent Decision

Before any task: run scope probe (1 Bash):
```bash
find <path> -name "<pattern>" | wc -l
grep -rl "<keyword>" src/ | wc -l
```
| Probe Result | Action |
|---|---|
| < 5 files / < 300 lines / ≤ 10 tool calls | Proceed in main context |
| ≥ 5 files / ≥ 300 lines / > 10 tool calls | Spawn `Agent (subagent_type=Explore)` → summary ≤500 tokens |

Also spawn for: multi-page web research.

---

## R5 · Index-First Lookup

**Pre-Read Gate — emit BEFORE every Read call, no exceptions:**
```
**[pre-read]** Target: `<symbol or section>` · Tier: T<1|2|3> · Line: <N> · Will read: offset=<N> limit=60
```
→ Cannot fill "Line: <N>"? → grep not done yet → run grep first, then emit gate
→ Reading without this gate = RULE VIOLATION → emit `[violation] R5` → re-run grep

**Pre-Edit Gate — emit BEFORE every Edit/Write that modifies a named symbol:**
```
**[pre-edit]** Symbol: `<name>` · index_variables lookup: T1 done · used_in: <N files> · safe to edit: <yes|needs review>
```
→ Step 1: `grep -A 8 '"SymbolName"' knowledge/index_variables.json` → check `"used_in"` array
→ Step 2: every file in `used_in` is a dependent — confirm change is safe for all of them
→ `used_in` not empty AND dependents not reviewed? → STOP → report blast radius to user first
→ Editing without this check = RULE VIOLATION → emit `[violation] R5-edit`

**Config files load ONCE at Boot (B1–B3) — never re-read mid-session:**
- CLAUDE.md, index_files.json, index_variables.json → in working memory after Boot
- Re-read only after TOKEN PAUSE + resume

**Lookup tiers — stop at first tier that yields line number:**
```bash
# T1: grep index — always start here (cheapest)
Bash: grep -A 8 '"SymbolName"' knowledge/index_variables.json
Bash: grep -A 6 '"src/path/file.tsx"' knowledge/index_files.json
→ got "source" + "line"? → emit [pre-read] → Read offset=<line-5> limit=60 → STOP HERE

# T2: widen index — only if T1 found nothing useful
Bash: grep -B 2 -A 20 '"SymbolName"' knowledge/index_variables.json
→ got what you need? → STOP HERE

# T3: grep source file — only if symbol not in index at all
Bash: grep -n "SymbolName\|function SymbolName\|const SymbolName" src/path/to/file.ts
→ got line number? → emit [pre-read] → Read offset=<line-5> limit=60 → STOP HERE
```

**Absolute limits — no exceptions, no rationalization:**
| Prohibited | Required instead |
|---|---|
| Read file without offset+limit | grep first → get line N → Read offset=N-5 limit=60 |
| Read >60 lines per call | Split into multiple targeted reads at separate offsets |
| Read knowledge/*.json in full | grep the specific key only |
| Re-read CLAUDE.md mid-session | Already in working memory — do not re-read |
| "Need full context before editing" | T1→T2→T3 gives enough context. Full-file = violation |

→ Details: `.agents/skills/editor/SKILL.md`

---

## R6 · Output Filter
Pipe all Bash: `cmd 2>&1 | grep -iE "error|warn|fail" | tail -20`
Stop if filtered output answers the question.

---

## R7 · Response Density
Default: table/bullet over prose (~40% fewer tokens).
- Comparison → table · Steps → numbered list · Enumeration → bullet
- Prose only when structure is impossible

---

## R8 · Index Sync
| Event | Action |
|---|---|
| Create/delete/move file | Update `knowledge/index_files.json` + backlinks |
| Edit file (add/remove imports) | Update backlinks in `knowledge/index_files.json` |
| Create/delete/rename symbol | Update `knowledge/index_variables.json` + run `python scripts/symbol_indexer.py` |
| Edit any symbol body | Run `python scripts/symbol_indexer.py` to refresh line numbers |
→ Details: `.agents/skills/file_manager/SKILL.md`, `.agents/skills/variable_manager/SKILL.md`

---

## R9 · Error Protocol

⚠️ **MANDATORY — 3 checks BEFORE any debug or fix. Skipping = rule violation.**
```
Step 1 — Search error history:
  Bash: grep -A 12 '<symptom_keyword>' knowledge/error_index.md | head -30
  → ERR found: apply resolution immediately — do NOT re-investigate

Step 2 — Check symbol index:
  Bash: grep -A 8 '"FailingSymbol"' knowledge/index_variables.json
  → Review: source file · line number · used_in (blast radius)

Step 3 — Check file index:
  Bash: grep -A 6 '"failing/file.ts"' knowledge/index_files.json
  → Review: backlinks (who imports this — full blast radius)
```
Only after all 3 steps pass → proceed to fix. Emit [✓ R9].

**Task ID:** `T-{ParentTask}-{BugID}-{AttemptID}` · e.g. `T-004-001-02`
**Status:** `[ ]` → `[/]` (in progress) → `[X]` (done)

**New error workflow:**
1. grep roadmap → find parent task ID
2. grep roadmap → count existing bugs → assign next BugID
3. Add: `[ ] T-004-001-01: <description>` to `docs/master_roadmap.md`
4. Load `editor` skill → fix
5. Run `python scripts/symbol_indexer.py`
6. `grep "## ERR-" knowledge/error_index.md | tail -1` → highest + 1
7. Write entry → `knowledge/error_index.md`
8. Mark done: `[X] T-004-001-01 (→ ERR-XXX)`

---

## R10 · Tool Result Cap
Truncate all tool results at 300 lines before processing.
If >300 lines: grep/filter relevant section only.

---

## R11 · English-first Analysis
For reasoning >5 steps:
- Outline/analysis in English (code block)
- Thai only for summary + next action

---

## R12 · Post-Edit Verification

**Every write action must be verified before reporting success to the user.**

> Task-specific `Verify-<N>` commands defined in Phase 2 DoD take priority over this table.
> If a Verify-<N> exists for the current section, run it — the table below is the fallback only.

| Action type | Verify by |
|---|---|
| Edit src/ file | Re-read changed section to confirm edit landed; check no broken imports |
| Add/remove symbol | Run `python scripts/symbol_indexer.py` → confirm symbol present/absent in index |
| DB schema change | Confirm no ERR-007 violations (no multi-row insert, no onConflictDoNothing, no float in int) |
| Create/delete file | Confirm `knowledge/index_files.json` updated + backlinks resolved |
| Error fix | Confirm ERR-XXX written to `knowledge/error_index.md` + roadmap task marked `[X]` |

**Result reporting:**
- ✅ PASS — state what was verified and what matched
- ⚠️ PARTIAL — state what completed and what still needs checking
- ❌ FAIL — do NOT say "done"; report what is missing or incorrect

Never report a task complete before verification passes.

---

## R13 · Escalation Protocol

**AttemptID = 02 = STOP. Do not attempt a 3rd fix automatically.**

Triggers:
- Same ERR-XXX recurs after fix was applied
- Tool call returns error 2× in a row on same step
- R12 Verification returns FAIL twice on the same action
- Session >60k tokens with task still unresolved

On trigger → emit `[blocked]` trace:
```
[blocked] Task: <T-ID> · Attempts: 2 · Cause: <root cause> · Need: <what is missing>
```
Then stop and wait for user direction. Do NOT auto-retry.

---

## R14 · Destructive Action Gates

**Before executing any of the following, emit gate and wait for user confirmation.**

| Action | Why it needs a gate |
|---|---|
| Delete or overwrite any file in `src/` or `knowledge/` | Irreversible without git |
| Any edit to files in `src/db/` (schema, migration, seed, queries) | Changes DB structure or data shape |
| Change/rename/remove TypeScript type or interface with DB column fields | Drizzle derives schema from TS types — silent breakage |
| Any symbol in index_variables.json with type `DBTable`, `DBColumn`, or `DrizzleSchema` | Cascading data corruption across all dependents |
| Batch operations affecting >5 files at once | Hard to audit and roll back |
| Any action outside current roadmap task scope | Scope creep risk |

Gate format — emit and pause:
```
[gate] Action: `<what>` · Scope: `<files/tables affected>` · Risk: `<why>` · Waiting: confirm
```
Do NOT proceed until user confirms.

---

## R15 · DB Structure Hard Stop

**Any of the following = DB structure change. HALT — do NOT touch anything until user says "yes" explicitly.**

Triggers (any one is enough to halt):
- Edit to any file in `src/db/` — schema, migration, seed, connection, or query files
- Rename, remove, or change TypeScript type/interface that has DB column fields
- Any symbol in `index_variables.json` with type `DBTable`, `DBColumn`, or `DrizzleSchema`
- Adding/removing columns, changing column types, altering table relationships

Gate — emit and WAIT for explicit confirm before any tool call:
```
[db-gate] File: `<path>` · Symbol: `<name>` · Change: `<what will change>`
          DB impact: `<tables/columns affected>` · Data risk: `<what could break>`
          → Waiting for explicit "yes" — NOT proceeding until confirmed
```

On user confirm → proceed (still subject to R14 gate + R12 verification).
On unclear or no response → treat as deny. Re-state impact and ask again.

**"It's just a TypeScript type" is NOT an exemption.** Drizzle derives the DB schema from TypeScript types — a type rename silently breaks migrations and queries.

---

## R-Roadmap · Log All Work Before Starting

**Every task — bug fix, feature, enhancement — must be in roadmap before execution.**

| Work type | Format | Example |
|---|---|---|
| New feature | `[ ] T-<N>: <description>` | `[ ] T-017: Add export button` |
| Bug fix | `[ ] T-{Parent}-{BugID}-{AttemptID}: <desc>` | `[ ] T-004-001-01: Fix null crash` |
| Sub-task | `  - [ ] T-<N>.{sub}: <desc>` | `  - [ ] T-015.1: Add sort` |
| Re-attempt | Increment AttemptID | `[ ] T-004-001-02: Fix null crash (attempt 2)` |

grep roadmap before creating — never duplicate task IDs.
Update: `[ ]` → `[/]` → `[X]` · After bug fix: append `(→ ERR-XXX)`

Completion annotation (trajectory tracking — append when marking `[X]`):
```
[X] T-004-001-01: Fix null crash (→ ERR-007) · attempts: 1 · tool_calls: 6
```

---

## Knowledge Base Paths
```
knowledge/index_files.json      ← backlinks for all files (lookup before edit)
knowledge/index_variables.json  ← symbols + line numbers (lookup before edit)
knowledge/error_index.md        ← ERR-XXX codes (search before debug)
docs/master_roadmap.md          ← task checklist
.agents/skills/registry.md      ← skill routing table
.sessions/session_*.json        ← active session state
```

---

@AGENTS.md
