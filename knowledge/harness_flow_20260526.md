# Harness Complete Flow — Post-Fix Reference

> **Date:** 2026-05-26
> **Version:** v2.1 (CFP fix index + harness_doctor + checkpoint gates)
> **Session:** session_086+
> **Replaces:** harness_flow_20260525.md (v2.0)
>
> Definitive reference after v2.0 patches and 2026-05-26 improvements.
> Read alongside CLAUDE.md and AGENTS.md.
> ★ = 2026-05-25 patch · ● = 2026-05-26 CFP tracking + harness_doctor + checkpoints

---

## Layer Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  LAYER 0 · CONSTRAINTS (immutable — read first, every agent)         │
│                                                                      │
│  CLAUDE.md (project)        ← R1–R16, R-Roadmap (hard rules)        │
│  AGENTS.md                  ← Boot + Loop Architecture (procedure)  │
│  INVARIANTS.md              ← I1–I8 (I8: CFP index race condition)   │
│  REPO_MAP.md                ← directory rules + dependency direction │
│  CODING_FAILURE_PATTERNS.md ← CFP-001–CFP-009+ (post-mortem log)    │
└────────────────────────────┬─────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────────────┐
│  LAYER 1 · SKILL ROUTING                                             │
│                                                                      │
│  .agents/skills/skill-manifest.json   ← keyword → skill mapping     │
│  .agents/skills/registry.md           ← fast-match table            │
│  .agents/skills/mece/SKILL.md         ← Phase 2 planning            │
│  .agents/skills/editor/SKILL.md       ← code edit + [post-read] ★  │
│  .agents/skills/coder/SKILL.md        ← new file + [post-read] ★   │
│  .agents/skills/agent/SKILL.md        ← orchestration + merge ★    │
│  .agents/skills/session_manager/SKILL.md ← pause/resume/close ★    │
│  .agents/skills/self_improve/SKILL.md    ← CFP review + harness ✦  │
│  .agents/skills/harness_doctor/SKILL.md  ← structural CFP fix ●      │
│  .agents/skills/token_tracker/SKILL.md   ← estimation formulas      │
│  .agents/skills/file_manager/SKILL.md    ← index_files sync         │
│  .agents/skills/variable_manager/SKILL.md← index_variables sync     │
│  .agents/platform/detected.md         ← spawn_tool per platform     │
└────────────────────────────┬─────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────────────┐
│  LAYER 2 · KNOWLEDGE BASE                                            │
│                                                                      │
│  knowledge/index_files.json      ← backlinks (imported_by, imports) │
│  knowledge/index_variables.json  ← symbols + line numbers (used_in) │
│  knowledge/index_sessions.json   ← session history index ★★         │
│  knowledge/index_cfp_fix.json    ← CFP occurrence + fix tracking ●   │
│  knowledge/error_index.md        ← ERR-XXX codes (search first)     │
│  docs/master_roadmap.md          ← task checklist [ ]→[/]→[X]       │
│                                                                      │
│  INDEX MAINTENANCE SCRIPTS (rebuild knowledge layer):               │
│  scripts/symbol_indexer.py  ← scans src/ → updates index_variables  │
│  scripts/lookup.py          ← T0 oracle: file+line+hint in one call ★★│
│  scripts/session_indexer.py ← scans .sessions/ → index_sessions ★★  │
└────────────────────────────┬─────────────────────────────────────────┘
                             ↓
┌──────────────────────────────────────────────────────────────────────┐
│  LAYER 3 · SESSION STATE                                             │
│                                                                      │
│  .sessions/active_thread.md     ← phase: done|in_progress|blocked   │
│  .sessions/session_tokens.md    ← SESSION_TOTAL (gate writes only)  │
│  .sessions/mece_plan.md         ← section checklist + pending       │
│  .sessions/session_handoff.md   ← resume point                      │
│                                    + attempt_count ★                │
│                                    + mece_plan_hash ★               │
│  .sessions/session_NNN.json     ← archive (session_001–073)         │
│  .sessions/compact_state.md    ← B1 restore: dt/sk/sk_h/mece_h/p3 ◆│
│                                   written at session close (Step 5.3)│
│                                   same-day → skip B2/B3 (~2.9k tok) │
└──────────────────────────────────────────────────────────────────────┘
                   ★ = added in 2026-05-25 vulnerability fixes
                   ● = added in 2026-05-26 CFP tracking + harness_doctor + checkpoint gates
                   ◆ = added in 2026-05-27 compact_state.md + mece_plan_controler fixes
```

---

## Boot Sequence

```
USER MESSAGE
     │
     ▼
┌─────────────────────────────────────────────────────────────────┐
│  BOOT  [AGENTS.md §Boot · CLAUDE.md §Boot · max 3 tool calls]  │
│                                                                 │
│  [B1] Bash: check .sessions/compact_state.md dt= field ◆       │
│       dt=today → emit [compact-restore] · cat compact_state.md │
│       Then: read .sessions/active_thread.md                    │
│       ├─ phase = in_progress  → load SESSION_TOTAL             │
│       └─ phase ≠ in_progress  → SESSION_TOTAL = 0 (reset)      │
│       + grep roadmap [/] · echo CFP_COUNT: N → cfp_boot_count  │
│                                                                 │
│  [B2] IF [compact-restore]: parse sk= → use as skill_name ◆   │
│            SKIP manifest read (~1,300 tokens saved)            │
│       ELSE IF prompt `skill: <name>` → skip manifest           │
│       ELSE: grep skill-manifest.json keywords → skill_name     │
│                                                                 │
│  [B3] IF [compact-restore]: sha1 check sk_h + mece_h ◆        │
│            match → SKIP SKILL.md reads (~2.9k tokens saved)   │
│            mismatch → re-read (file changed)                   │
│       ELSE: Read SKILL.md offset=1 limit=80 → sections[] ONLY  │
│             + Read mece/SKILL.md offset=31 limit=110           │
│             → §Plan Format + §Execution Protocol in memory     │
│                                                                 │
│  [B4] *** only if detected.md has platform: unknown ***        │
│       → probe available tools → update detected.md             │
│       → no match → [platform-unknown] → ask 4 questions        │
└─────────────────────────────────────────────────────────────────┘
     │
     ├─── phase = in_progress? ────────────────────────────────┐
     │                                                         │
     │  RESUME STALENESS GATE ★ [AGENTS.md §Boot]             │
     │  ┌─────────────────────────────────────────────────┐   │
     │  │ sha1sum .sessions/mece_plan.md                  │   │
     │  │   vs mece_plan_hash in session_handoff.md       │   │
     │  │ git status --short src/ → any changes?          │   │
     │  │                                                 │   │
     │  │ hash mismatch OR src/ changed:                  │   │
     │  │   → emit [plan-stale]                          │   │
     │  │   → ask user: reconfirm plan or rebuild?       │   │
     │  │                                                 │   │
     │  │ hash matches AND src/ clean:                    │   │
     │  │   → Phase 3 directly (skip Phase 1–2)          │   │
     │  └─────────────────────────────────────────────────┘   │
     └─────────────────────────────────────────────────────────┘
     │
     ▼
  Reply line 1 (mandatory — CFP: field enforces cfp_boot_count extraction ◆):
  [Boot] Thread: <done|in_progress> · Tasks: N · Skill: <name> · Tokens: ~Nk · CFP: N
```


╔══════════════════════════════════════════════════════════╗
║ CHECKPOINT CK1: Post-Boot — Ready to Route?             ║
╠══════════════════════════════════════════════════════════╣
║ □ [Boot] trace emitted in reply line 1                  ║
║ □ compact_state.md checked · [compact-restore] if today ◆║
║ □ cfp_boot_count stored in working memory (B1)          ║
║ □ skill_name cached from B2/B3 · or from sk= field ◆   ║
║ □ SESSION_TOTAL = 0 (fresh) or loaded (resume)          ║
║ → any □ missing: re-run missing Boot step before C0     ║
╚══════════════════════════════════════════════════════════╝
> ⚠️ **Boot ending ≠ ready to work.** After Reply line 1 → run C0–C3 → then Phase 1.
> Reading SKILL.md at B3 is NOT Phase 1. Do NOT touch `src/` until `[✓ gather]` AND `[✓ MECE]` emitted.
> See: `CLAUDE.md §MANDATORY BOOT GATE`

---

## Per-Turn Routing

```
Every user message — run C0 → C1 → C2 → C3 before any work ✦
[CLAUDE.md §Per-Turn · AGENTS.md §Per-Turn]
     │
     ▼
┌────────────────────────────────────────────────────────────────────┐
│  [C0] if c0_resolved flag set → clear → skip to C1 ◆              │
│       COMPLAINT CHECK ✦ (R16 CLAUDE.md)                           │
│       signals: "ทำไมไม่ทำตาม" · "you skipped" · "didn't log"      │
│                "harness says" · "ไม่ได้บันทึก"                     │
│       "ลืม" qualifier: object must be a harness step name          │
│         (roadmap/error_index/CFP/index/boot/skill/gate/MECE)       │
│         "ลืมบอกให้เพิ่ม X" = feature → NOT C0                     │
│       YES → emit [self-improve] → backfill (ask if context gone)   │
│           → log CFP → set c0_resolved=true → re-run C0-C1-C2-C3 ◆ │
│       NO  → continue to C1                                         │
│                                                                    │
│  [C1] Read .sessions/active_thread.md → extract task: field        │
│                                                                    │
│  [C2] TOPIC SWITCH CHECK ✦                                         │
│   IS new topic (close session first):                              │
│     · Different app section (site-plan↔center↔admin↔report)       │
│     · Different primary entity (job↔user↔plan↔request)            │
│     · Different intent type (debug→feature, or feature→debug)      │
│     · Message names different src/app/ route than current task     │
│   NOT a switch:                                                    │
│     · "also fix/update" · revision of approach · added constraint  │
│     · bug inside current work · "ต่อ/continue/keep going"          │
│   UNCERTAIN → emit [topic-unclear] → ASK before routing            │
│                                                                    │
│  [C3] ROUTE                                                        │
│   TOPIC SWITCH →                                                   │
│       emit [topic-switch] Current: X · New: Y · Closing first      │
│       → session_manager §3 (close + reset) → new Phase 1          │
│   SAME TOPIC →                                                     │
│       match keywords[] → re-read SKILL.md if skill changes         │
└────────────────────────────────────────────────────────────────────┘

Routing examples (after C2 confirms same topic):
  "แก้ bug / fix / error"       → editor/SKILL.md
  "สร้าง / เพิ่ม / implement"   → coder/SKILL.md
  "ปิด / close / done"           → session_manager/SKILL.md
  "plan / วางแผน"                → mece/SKILL.md
  "review CFP / improve harness" → self_improve/SKILL.md ✦
  "harness doctor / structural"  → harness_doctor/SKILL.md ●
  no match                      → agent/SKILL.md (fallback)
```


╔══════════════════════════════════════════════════════════╗
║ CHECKPOINT CK2: Post-C3 — Ready for Phase 1?            ║
╠══════════════════════════════════════════════════════════╣
║ □ C0 complaint resolved (or c0_resolved cleared)        ║
║ □ C1 active_thread.md read → task: field extracted      ║
║ □ C2 topic switch resolved (stay / close+reopen)        ║
║ □ C3 skill_name matched and routed                      ║
║ → any □ missing: complete C0-C3 first                   ║
╚══════════════════════════════════════════════════════════╝
> ⚠️ **After C3 (any branch) → MANDATORY: Phase 1 G1-G2-G3 next. No exceptions.**
> Knowing the skill from B3 does NOT satisfy Phase 1. Must grep indexes + read files + emit `[✓ gather]`.
> Then Phase 2: MECE plan → user confirm → write `mece_plan.md` → emit `[✓ MECE]`.
> **Infrastructure gate:** PreToolUse hook blocks `src/` Edit if `mece_plan.md` absent.
> See: `CLAUDE.md §PHASE TRANSITION GATE`, `AGENTS.md §Per-Turn line 122`

---

## Phase 1 · Info Gather

```
[AGENTS.md §Phase 1 · CLAUDE.md §R5 · editor/SKILL.md · coder/SKILL.md]

┌─────────────────────────────────────────────────────────────────────┐
│  GATHER LOOP — Hybrid front-loaded model (max 3 loops total) ◈      │
│                                                                     │
│  [G1] SCAN ALL sections at once — one pass, not per-section ◈      │
│       For EACH section in Skill sections[]:                         │
│         □ What file/symbol does this section need?                  │
│         □ Available via index grep, or needs user input?            │
│       Output: missing_files[] + missing_user_input[]               │
│       → missing_user_input not empty?                               │
│           Compile COMPLETE list → ask user ONCE (all items)         │
│           NEVER ask per-item mid-loop                               │
│           Wait for reply → restart G1 with new info                │
│       → missing_files only? → proceed to G2                        │
│                                                                     │
│  [G2] BATCH RETRIEVE — all greps in ONE Bash call ◈                │
│       Run ALL needed greps together → get line numbers              │
│       Then: targeted Read per item (offset+limit, never full file)  │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │ PRE-READ GATE ★ [CLAUDE.md §R5]                             │  │
│   │ emit before EVERY Read (no exceptions):                      │  │
│   │   [pre-read] Target: X · Tier: T1|2|3 · Line: N             │  │
│   │ no line number → grep not done → grep first                  │  │
│   │ Read without gate = [violation R5] → discard → redo          │  │
│   └──────────────────────────────────────────────────────────────┘  │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │ POST-READ VERDICT ★ [CLAUDE.md §R5]                         │  │
│   │   [post-read] File: <path> · Verdict: relevant|partial|irrelevant│
│   │ irrelevant → DROP from context NOW · not in Phase 2          │  │
│   │ partial    → keep excerpt only (note L<N>–L<N>)              │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [G3] ASSESS — all must pass:                                       │
│       □ every Skill section has ≥1 resolved file/symbol            │
│       □ every Skill section has a Verify-N criterion               │
│       □ no "?" placeholders remain                                 │
│       ✅ all clear → emit [✓ gather] → Phase 2                    │
│       ❌ new dependency found → loop once more (max 2 extra loops) │
│       count = 3 → [gather-stalled] → ask user (single message)     │
│                                                                     │
│  Hard limits ◈: G1 = 1 pass all sections · G2 = 1 Bash batch       │
│  User asks = max 1 per Phase 1 run · TOKEN check: >60k → PAUSE     │
└─────────────────────────────────────────────────────────────────────┘
```

---
╔══════════════════════════════════════════════════════════╗
║ CHECKPOINT CK3: Pre-Phase 2 — Gather Complete?          ║
╠══════════════════════════════════════════════════════════╣
║ □ [✓ gather] emitted this phase                         ║
║ □ gather_complete.md exists (date = today)              ║
║ □ Every Skill section: ≥1 resolved file/symbol          ║
║ □ Every Skill section: draft Verify-N criterion         ║
║ □ No "?" placeholders in working notes                  ║
║ → any □ missing: back to G1 (Phase 1)                   ║
╚══════════════════════════════════════════════════════════╝


## Phase 2 · MECE Plan

```
[AGENTS.md §Phase 2 · .agents/skills/mece/SKILL.md · INVARIANTS.md §I6]

Runs ONCE per task. Resume → skip if plan is still valid.

┌─────────────────────────────────────────────────────────────────────┐
│  [M1] Load .agents/skills/mece/SKILL.md                             │
│                                                                     │
│  [M1.5] REASON — extended reasoning pass across ALL sections:       │
│   □ Dependencies: A→B output chain? → Sequential                   │
│   □ Parallelizable: no shared state → Parallel (feeds Cycle groups) │
│   □ Irreversible: [gate]/delete/DB? → flag for M3 user attention    │
│   □ Risk surface + Outcome sketch → feeds M2.5 Verify-N            │
│   Budget: ≤600 tokens · working memory only · not written to file   │
│                                                                     │
│  [M2] Build plan 1:1 with Skill sections — REQUIRED per section:    │
│   Section N — <name from Skill sections[]>:                         │
│     Skill:    <editor|coder|file_manager|variable_manager|agent>    │
│     Steps:   [A] → [B] → [C]                                       │
│     Verify:  <checkable command — see Verify Pattern Lookup>        │
│     Rollback: <what to undo>                                        │
│   ★ Skill: field mandatory per section [mece/SKILL.md §Plan Format] │
│                                                                     │
│  [M2.5] Define Verify-N per section (DoD):                          │
│   Verify-1: `grep -c "symbolName" src/path.ts` → 1                 │
│   Verify-2: `npm run build 2>&1 | grep -c "error"` → 0             │
│   ★ Verify Pattern Lookup [mece/SKILL.md §Verify Patterns]:         │
│     symbol create/delete/rename · import add/remove · file ops      │
│     build · tsc · DB table/row · index sync · roadmap [X] · ERR    │
│                                                                     │
│  [M3] Send plan + Verify-N to user → wait for confirm               │
│       user must confirm BOTH plan steps AND verify criteria         │
│                                                                     │
│  [M4] Write roadmap entries ★ [INVARIANTS.md §I6]                  │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │ If spawning parallel sub-agents:                            │  │
│   │ 1. grep roadmap → find last T-N                             │  │
│   │ 2. pre-assign T-N+1, T-N+2 ... for every section           │  │
│   │ 3. write ALL [ ] T-N entries BEFORE any spawn call          │  │
│   │ 4. pass assigned T-ID to each sub-agent                     │  │
│   │ ★ sub-agents must NOT self-assign IDs (race condition risk)  │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [M5] emit [✓ MECE] → proceed to Phase 3                           │
└─────────────────────────────────────────────────────────────────────┘
```

---
╔══════════════════════════════════════════════════════════╗
║ CHECKPOINT CK4: Pre-Phase 3 — MECE Complete?            ║
╠══════════════════════════════════════════════════════════╣
║ □ [✓ MECE] emitted                                      ║
║ □ .sessions/mece_plan.md written today                  ║
║ □ mece_plan.md has ≥2 Verify-N criteria                 ║
║ □ User explicitly confirmed plan + Verify-N             ║
║ □ Roadmap [ ] T-N entries written                       ║
║ → any □ missing: back to Phase 2 (M1-M5)               ║
╚══════════════════════════════════════════════════════════╝


## Phase 3 · REACT Loop (Execution)

```
[AGENTS.md §Phase 3 · CLAUDE.md §R2/R5/R6 · editor/SKILL.md]

SECTION LOOP (S = 1 → N per MECE plan)
     │
     ├─ TOKEN check: >60k → finish step → TOKEN PAUSE ──────────────┐
     │                                                               │
     ▼                                                               │
┌──────────────────────────────────────────────────────────────────┐ │
│  REACT LOOP (repeat per step until section complete)             │ │
│                                                                  │ │
│  [L1] SELECT → next tool                                         │ │
│       R2: max 5 tool calls/turn [CLAUDE.md §R2]                  │ │
│       R5: index-first before every Read [CLAUDE.md §R5]          │ │
│                                                                  │ │
│  [L2] EXECUTE → run tool                                         │ │
│       R6: pipe output | grep -iE "error|warn|fail" | tail -20    │ │
│       [CLAUDE.md §R6]                                            │ │
│                                                                  │ │
│  [L3] OBSERVE → result correct?                                  │ │
│       unexpected → retry 1×                                      │ │
│       retry fails → BLOCKED ───────────────────────────────────┐ │ │
│                                                                  │ │ │
│  [L4] VERIFY — both must pass:                                   │ │ │
│  (a)  grep confirm → emit [✓ written]                            │ │ │
│       not found → retry 1× → fail → BLOCKED ───────────────────┤ │ │
│  (b)  run Verify-N defined in Phase 2                            │ │ │
│       PASS → section_done eligible                               │ │ │
│       FAIL → do NOT mark done → BLOCKED ────────────────────────┤ │ │
│                                                                  │ │ │
│  [L4.5] PURGE ◈ drop step's tool results from working context    │ │ │
│         keep only: [✓ written] verdict + artifact path + Verify  │ │ │
│         NEVER carry raw tool output to next step                 │ │ │
│                                                                  │ │ │
│  [L5] DECIDE                                                     │ │ │
│       steps remain → [loop] Section S · step <name> → continue  │ │ │
│       (a)+(b) pass → emit [loop] done · section complete         │ │ │
└──────────────────────────────────────────────────────────────────┘ │ │
     │                                                               │ │
     ▼                                                               │ │
╔══════════════════════════════════════════════════════════╗
║ CHECKPOINT CK5: Pre-Next-Section — Section Done?        ║
╠══════════════════════════════════════════════════════════╣
║ □ [✓ written] grep verify passed for this section       ║
║ □ Verify-N from mece_plan.md for this section: PASS     ║
║ □ mece_plan.md: current section marked [X]              ║
║ □ Roadmap T-N for this section marked [X]               ║
║ → any □ missing: stay in REACT LOOP (do NOT advance)    ║
╚══════════════════════════════════════════════════════════╝
Write .sessions/session_handoff.md ★ [session_manager/SKILL.md §2]  │ │
  sections_done: [list]                                              │ │
  sections_pending: [list]                                           │ │
  last_step: <name>                                                  │ │
  attempt_count: N    ← retries used on current step (0 or 1) ★    │ │
  mece_plan_hash: X   ← sha1 of mece_plan.md at this moment ★      │ │
  cfp_boot_count: N   ← persisted for /compact resume recovery ◆   │ │
  cfp_deferred: {}    ← merged (not overwritten) at session close ◆ │ │
  cfp_dismissed: []   ← permanent — survives across sessions ◆     │ │
  last_self_improve_session: <id> ← cooldown gate reference ◆      │ │
     │                                                               │ │
     └─ next section ────────────────────────────────────────────────┘ │
                                                                        │
TOKEN PAUSE [session_manager/SKILL.md §2] ◄─────────────────────────── │
┌──────────────────────────────────────────────────────────────────────┐
│ 1. finish current step (never stop mid-step)                         │
│ 2. write session_handoff.md (with attempt_count + mece_plan_hash ★) │
│ 3. ask user: "ดำเนินการต่อไหมครับ?"                                   │
│ 4. on confirm:                                                       │
│                                                                      │
│    MECE Staleness Gate ★ [session_manager/SKILL.md §2 step 2b]      │
│    ┌─────────────────────────────────────────────────────────────┐  │
│    │ sha1sum mece_plan.md vs mece_plan_hash in handoff           │  │
│    │ git status --short src/ → any changes?                      │  │
│    │ mismatch → [plan-stale] → ask: reconfirm or rebuild?        │  │
│    │ match + clean → proceed silently                            │  │
│    └─────────────────────────────────────────────────────────────┘  │
│    restore attempt_count → budget = 1 if count=0, 0 if count=1 ★   │
│    reset to pending section → reopen REACT LOOP                     │
└──────────────────────────────────────────────────────────────────────┘

BLOCKED [session_manager/SKILL.md §2 · AGENTS.md §Phase 3]
┌──────────────────────────────────────────────────────────────────────┐
│ 1. HALT all remaining sections                                       │
│ 2. write session_handoff.md (status: blocked)                        │
│ 3. show: error detail + sections_done + sections_pending             │
│ 4. ask user: "แก้ก่อนดำเนินการต่อ หรือ skip section นี้?"            │
│    Fix  → user resolves → reload → resume blocked section           │
│    Skip → mark [/] + note → continue next section                   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Sub-agent Orchestration (Parallel Fan-out)

```
[agent/SKILL.md · AGENTS.md §Sub-agent Rules · INVARIANTS.md §I6/I7]

Trigger: ≥5 files / ≥300 lines / ≥2 MECE sections in same Cycle

┌──────────────────────────────────────────────────────────────────────┐
│  Pre-spawn checklist:                                                │
│  1. Read .agents/platform/detected.md → get spawn_tool              │
│     platform: unknown → run B4 probe first                          │
│  2. Pre-assign roadmap IDs ★ [INVARIANTS.md §I6]                   │
│     grep roadmap → last T-N                                          │
│     write [ ] T-N+1, T-N+2 for all sections BEFORE spawn            │
│     pass assigned T-ID to each sub-agent in Delegation Contract      │
│  3. Delegation Contract ◈ [agent/SKILL.md]: prompt ≤800 tokens      │
│     goal: 1-3 sentences · constraints: rule numbers only            │
│     context_files: paths only ≤5 · cycle_context: ≤5 bullets ≤150c  │
│     NEVER inject: session History / knowledge JSON / CLAUDE.md text │
└──────────────────────────────────────────────────────────────────────┘
     │
     ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Skill Delegation ★ [agent/SKILL.md §Skill Delegation Rules]         │
│                                                                      │
│  P1 — explicit `Skill:` in MECE plan section (overrides all)         │
│       `Skill: coder` → spawn coder regardless of action type         │
│                                                                      │
│  P2 — heuristics (when Skill: not declared):                         │
│       new files / features    → coder                                │
│       modify / fix existing   → editor                               │
│       file create/move/delete → also file_manager                   │
│       symbol create/rename    → also variable_manager               │
│                                                                      │
│  Multi-skill  `Skill: X + Y`:                                        │
│       run X first → verify → then Y                                  │
│       both write to cycle_N_<section_id>.json                        │
│       X fails → do NOT run Y → section blocked                      │
└──────────────────────────────────────────────────────────────────────┘
     │
     ▼
emit [cycle N] <spawn_tool> [A, B, ...] → .sessions/cycle_N_*.json
     │
     ├─── Sub-agent A ──────────────────────────────────────────────┐
     │    writes .sessions/cycle_N_A.json:                          │
     │    { "cycle": N, "section": "S1-name",                       │
     │      "status": "done|blocked",                               │
     │      "verify_result": "<output>",                            │
     │      "artifacts": ["path/to/file"],                          │
     │      "tokens_estimated": N,   ← REQUIRED ★ (I7)             │
     │      "notes": "" }                                           │
     └──────────────────────────────────────────────────────────────┘
     ├─── Sub-agent B ─── (same format) ───────────────────────────┘
     │
     ▼
After ALL Cycle N agents complete — orchestrator reads results:
┌──────────────────────────────────────────────────────────────────────┐
│  a. validate each cycle_N_*.json [agent/SKILL.md §5a]               │
│     required keys: cycle, section, status, verify_result,           │
│                    artifacts, tokens_estimated ★                     │
│     status must be "done" or "blocked"                               │
│     missing file / invalid JSON → treat as blocked                  │
│                                                                      │
│  b. any blocked → HALT all remaining Cycles → BLOCKED flow          │
│                                                                      │
│  c. aggregate results — Context Trim (apply [post-read] verdicts ★) │
│     irrelevant verdict → exclude from context_files:                 │
│     partial verdict → pass path+line range only                     │
│                                                                      │
│  d. TOKEN MERGE ★ [agent/SKILL.md §5d · INVARIANTS.md §I7]         │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ sum tokens_estimated from all cycle_N_*.json                  │ │
│  │ missing tokens_estimated → add 2,000 flat (buffer)            │ │
│  │ add sum to SESSION_TOTAL (working memory)                     │ │
│  │ write updated total → .sessions/session_tokens.md             │ │
│  │ check R3 threshold immediately                                │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
     │
     ├─── >50k AND compact not run → compact first → emit [compact]
     ├─── >60k → TOKEN PAUSE (do not spawn Cycle N+1 until confirmed)
     └─── ≤50k → spawn Cycle N+1 with cycle_context: from results
```

---

## MECE Plan Templates

```
[mece/SKILL.md §Templates — select by task type]

┌────────────────────────────────────────────────────────────────────────────┐
│  Bug Fix  (target: editor)                                                 │
│  S1 Diagnose:      Skill: editor · R9 3-checks · blast radius             │
│  S2 Edit & Verify: Skill: editor · targeted fix · grep confirm            │
│  S3 Sync & Close:  Skill: editor · indexer · ERR-XXX · roadmap [X]        │
│  Cycles: 1:[S1] → 2:[S2] → 3:[S3]   (serial — each depends on previous)  │
├────────────────────────────────────────────────────────────────────────────┤
│  New Feature  (target: coder)                                              │
│  S1 Scope & Index: Skill: agent         · scope probe · conflict check    │
│  S2 Build:         Skill: coder         · create files · verify each      │
│  S3 Sync & Close:  Skill: file_manager+variable_manager · index · roadmap │
│  Cycles: 1:[S1] → 2:[S2] → 3:[S3]                                        │
├────────────────────────────────────────────────────────────────────────────┤
│  Refactor / Rename  (target: editor)                                       │
│  S1 Diagnose:      Skill: editor           · grep index · used_in list    │
│  S2 Edit & Verify: Skill: editor           · rename all · verify 0 old    │
│  S3 Sync & Close:  Skill: variable_manager · indexer · roadmap [X]        │
│  Cycles: 1:[S1] → 2:[S2] → 3:[S3]                                        │
├────────────────────────────────────────────────────────────────────────────┤
│  Multi-skill / Complex Feature  (target: agent)                            │
│  S1 Scope & Design: Skill: agent                                           │
│       scope probe · assign skill per section · pre-assign ALL T-IDs ★    │
│  S2 Build New:      Skill: coder         · create files                   │
│  S3 Modify Existing:Skill: editor        · targeted edits                 │
│  S4 Sync & Close:   Skill: file_manager+variable_manager                  │
│  Cycles: 1:[S1] → 2:[S2,S3] parallel → 3:[S4]                            │
│  S4 context-input: cycle_2_S2.json, cycle_2_S3.json ★                    │
└────────────────────────────────────────────────────────────────────────────┘

★ Pre-assign ALL T-IDs at S1 before any spawn (INVARIANTS.md §I6)
★ S4 context-input injected by orchestrator (agent/SKILL.md §Delegation Contract)
```

---

## Completion Gate

```
[AGENTS.md §Completion Gate]

CHECKPOINT CK6 — Agent may NOT report done until ALL pass:
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  □ All mece_plan.md sections = [X]                                  │
│    grep -cE "^\- \[ \]" .sessions/mece_plan.md → 0                  │
│                                                                      │
│  □ All N sections executed via tool calls (not just described)       │
│                                                                      │
│  □ Every write/edit has [✓ written] — grep verify passed             │
│    [AGENTS.md §L4 · CLAUDE.md §R12]                                 │
│                                                                      │
│  □ R8 Index Sync done (if any file/symbol changed)                   │
│    python scripts/symbol_indexer.py                                  │
│    [CLAUDE.md §R8 · INVARIANTS.md §I3]                              │
│                                                                      │
│  □ All roadmap entries marked [X] with annotation                   │
│    [X] T-N: desc (→ ERR-XXX) · attempts: 1 · tool_calls: 6          │
│    [INVARIANTS.md §I5 · CLAUDE.md §R-Roadmap]                       │
│                                                                      │
│  □ .sessions/active_thread.md → phase: done                         │
│                                                                      │
│  □ SESSION_TOTAL written → .sessions/session_tokens.md              │
│                                                                      │
│  □ Feedback & Error Summary delivered to user                        │
│    (errors/retries listed + new CFP if pattern found)               │
│                                                                      │
│  Any unchecked → continue Phase 3 (never report done prematurely)   │
│                                                                      │
│  OmO Reviewer (apply when sections > 2 OR any [gate]/DB action):    │
│  Spawn haiku sub-agent (read-only) BEFORE reporting done:            │
│    Prompt: Verify-N list from mece_plan.md + grep commands           │
│    Output: PASS or FAIL: [section, criterion, actual_output]         │
│    On FAIL → retry section (1× max) → R13 escalate if still fails   │
│    Reviewer has no Edit/Write tools — read-only only                 │
│  → [agent/SKILL.md §Orchestration step 7]                           │
│                                                                      │
│  All checked   → Task Complete ✅                                   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Guard Rail Quick Reference

```
Gate                    Trigger                               Source file
─────────────────────── ───────────────────────────────────── ──────────────────────────────
[recurring]             R9 Step 0 detects prior failed attempt  CLAUDE.md §R9 Step 0
                        → read Failed Approaches → choose different approach
[failed-approach]       R12 verify fails → write Failed Approaches before R13 escalate  CLAUDE.md §R9
[index T0] ★★           T0 lookup.py oracle call              CLAUDE.md §R5, editor/SKILL.md §T0
                        → runs before any grep/Read · returns file+line+read_hint
[session-lookup] ★★     lookup.py --session result used       session_manager §2 Step 1a, coder §1
                        → found prior session → inject as bullet context
[pre-read]              before EVERY Read call                CLAUDE.md §R5
[post-read] ★           after EVERY Read result              CLAUDE.md §R5, editor/coder SKILL.md
[pre-edit]              before EVERY Edit/Write on symbol     CLAUDE.md §R5
[violation R5] ★        Read/Edit without gate trace          CLAUDE.md §R5
                        → discard result → redo with gate
[never-full-load VIOLATION] ★★  PostToolUse Read hook fires   ~/.claude/settings.json §PostToolUse
                        → protected file read in full → discard → re-run as grep+offset
[WARN wrong-plan-file] ★★  PostToolUse Write hook fires        ~/.claude/settings.json §PostToolUse
                        → plan .md written outside .sessions/mece_plan.md → move content
[MECE CONTENT GATE] ★★  PreToolUse deny (src/ edit)           ~/.claude/settings.json §PreToolUse
                        → mece_plan.md has <2 Verify-N criteria → rewrite before proceeding
[plan-stale] ★          resume + hash mismatch / src changed  AGENTS.md §Boot, session_manager §2b
[gate]                  destructive action (delete/overwrite) INVARIANTS.md §I1
[db-gate]               edit src/db/ or DrizzleSchema symbol  INVARIANTS.md §I2
[gather-stalled]        Phase 1 loop count ≥ 3               AGENTS.md §Phase 1
[✓ gather]              context_sufficient all boxes checked  AGENTS.md §Phase 1
                        → MUST write .sessions/gather_complete.md (date: YYYY-MM-DD)
[✓ MECE]                plan confirmed by user               AGENTS.md §Phase 2
[✓ written]             grep verify after every write/edit    AGENTS.md §Phase 3 L4
[blocked]               retry ≥ 2× failed                    AGENTS.md §Phase 3 L3/L4
[loop]                  step/section progress trace           AGENTS.md §Phase 3 L5
[compact]               SESSION_TOTAL > 50k                  session_manager/SKILL.md §1
[plan-stale] ★          MECE staleness on resume             session_manager/SKILL.md §2b
[resume-attempt] ★      restore attempt_count on resume      session_manager/SKILL.md §2
[cycle N]               spawn parallel sub-agents            agent/SKILL.md §Orchestration
[platform-unknown]      detected.md platform: unknown        AGENTS.md §Boot B4
[topic-switch] ✦        new message = different topic         AGENTS.md §Per-Turn C2
                        → close session first → new Phase 1
[topic-unclear] ✦       topic ambiguous — ask before routing  AGENTS.md §Per-Turn C2
[self-improve] ✦        R16 complaint detected → backfill     CLAUDE.md §R16
[cfp-tally] ✦           new CFPs found at session close       self_improve/SKILL.md §1
[cfp-skip] ✦            no new CFPs → skip CFP review         self_improve/SKILL.md §1
[cfp-analysis] ✦        pattern rank + root cause emitted     self_improve/SKILL.md §2
[cfp-deferred] ✦        user skipped proposal → save count    self_improve/SKILL.md §3
[blocked-self-edit] ✦   §4 tried to edit self_improve itself  self_improve/SKILL.md §4 Invariants
[blocked-invariant] ◆   §4 proposal conflicts with INVARIANTS  self_improve/SKILL.md §4 Step 0.5
[cfp-cooldown] ◆        §4 skipped — ran too recently          self_improve/SKILL.md §4 Step 0
[cfp-pending] ◆         proposal not answered — re-present     self_improve/SKILL.md §3
[proposal-mismatch] ◆   proposed fix doesn't catch original    self_improve/SKILL.md §3 Step 2.5
[✓ harness-updated] ✦   harness file edited + verified        self_improve/SKILL.md §4
[purge] ◈               after L4.5 — tool results dropped      AGENTS.md §Phase 3 L4.5
[cfp-archive] ◈         CFP >20 → archive oldest to cfp_archive.md  self_improve/SKILL.md §1
[resume-config] ◈       skill unchanged on resume → skipped SKILL.md re-read  session_manager §2
[mece-audit]       ●  Verify-N PASS at session close              session_manager §3 Step 0.5
[mece-audit-skip]  ●  No mece_plan sections → audit skipped       session_manager §3 Step 0.5
[mece-audit-fail]  ●  Verify-N failed at close → CFP candidate    session_manager §3 Step 0.5
[cfp-recurred]     ●  Occurrence after fix applied_date detected   session_manager §3 Step 0.6
[diagnosis]        ●  CFP: target + prior fixes + diagnosing model harness_doctor §1
[audit-finding]    ●  Gap type a/b/c/d located in harness files    harness_doctor §2
[harness-proposal] ●  Structural fix proposed — HALT for confirm   harness_doctor §3
[harness-proposal-deferred] ● User skipped — count persisted       harness_doctor §4
[harness-doctor-skip] ● No recurred entries in index_cfp_fix.json  harness_doctor §1
[harness-fix]      ●  Structural fix applied + detection verified  harness_doctor §5

★ = added in 2026-05-25 vulnerability fixes
✦ = added in 2026-05-25 self-improvement + topic-switch patches
◆ = added in 2026-05-25 vulnerability audit fixes (V-Audit + Round 2)
◈ = added in 2026-05-25 token efficiency improvements (T-078–T-082)
★★ = added in 2026-05-26 index enrichment + session lookup (session_086)
● = added in 2026-05-26 CFP fix index + harness_doctor + checkpoint gates (session_086+)
```

---

## Token Tracking Formula

```
[CLAUDE.md §R1]

SESSION_TOTAL = sum of (Input_n + Output_n) across all turns

Input_n = user_msg_chars × 0.3
        + context_overhead
        + tool_result_tokens ★

  tool_result_tokens (per result) ★:     ← tiered formula (V2 fix)
    ≤ 150 lines  → result_chars × 0.3
    151–300 lines → result_chars × 0.5   (code/JSON higher density)
    > 300 lines  → result_chars × 0.5 + 1,000 flat buffer
    floor: 200 tokens per result minimum

  context_overhead:
    Turn 1   = ~4,000
    Turn N   = 200 + (SESSION_TOTAL × 0.08)

Output_n = thai_chars × 1.7 + en_chars × 0.3

Thresholds [CLAUDE.md §R3]:
  > 60k → TOKEN PAUSE (finish step → save state → ask user)
  > 90k → HALT immediately → save → report to user

Write to file ONLY at: token pause · blocked halt · completion gate · TOKEN CHECK point (write working memory SESSION_TOTAL before reading)
★ Cycle token merge also writes after each parallel Cycle N (INVARIANTS.md §I7)
```

---

## Vulnerability Fixes Summary (2026-05-25)

| V# | Issue | Fix | Files Changed |
|---|---|---|---|
| V1 | Pre-Read/Edit gate ceremonial only | Invalid result rule: discard + redo | `CLAUDE.md §R5`, `AGENTS.md` QR |
| V2 | Token estimation drift | Tiered formula by line count + flat buffer | `CLAUDE.md §R1` |
| V3 | MECE plan stale on resume | `mece_plan_hash` + git status check | `AGENTS.md §Boot`, `session_manager §2b` |
| V4 | Cycle result no schema validation | Already in `agent/SKILL.md`; added `tokens_estimated` requirement | `agent/SKILL.md §5a` |
| V5 | Retry budget not persisted | `attempt_count` field in handoff, restored on resume | `session_manager/SKILL.md §2` |
| V6 | Parallel token accounting gap | `tokens_estimated` in result schema + step d merge | `agent/SKILL.md §5d`, `INVARIANTS.md §I7` |
| V7 | CFP-004 post-read not in SKILL.md | `[post-read]` verdict mandatory in editor + coder | `editor/SKILL.md`, `coder/SKILL.md`, `CLAUDE.md §R5` |
| V8 | Roadmap ID collision in parallel | Pre-assign IDs before spawn | `INVARIANTS.md §I6`, `AGENTS.md` Sub-agent Rules |

**MECE & Delegation Improvements (2026-05-25):**

| M# | Gap | Fix | Files Changed |
|---|---|---|---|
| M1 | Plan had no `Skill:` field per section | Added mandatory `Skill:` to plan format + all templates | `mece/SKILL.md §Plan Format` |
| M2 | No DoD verify pattern reference | Added 14-row Verify Pattern Lookup table | `mece/SKILL.md §Verify Patterns` |
| M3 | No multi-skill task template | Added Multi-skill/Complex Feature 4-section template + Cycle grouping | `mece/SKILL.md §Templates` |
| M4 | No delegation priority in agent skill | Added P1 (explicit Skill:) / P2 (heuristic) + multi-skill X+Y handling | `agent/SKILL.md §Skill Delegation` |

New failure patterns documented: `CFP-008` (MECE staleness), `CFP-009` (parallel token gap) — `CODING_FAILURE_PATTERNS.md`

---

**Self-Improvement + Topic-Switch Patches (2026-05-25):**

| P# | Gap | Fix | Files Changed |
|---|---|---|---|
| P1 | Agent skipped topic-switch detection — carried stale context into new tasks | C0-C3 Per-Turn routing: topic-switch check + session close before new task | `AGENTS.md §Per-Turn`, `CLAUDE.md §Per-Turn` |
| P2 | Topic switch criteria vague — agent misjudged follow-ups as new topics | Explicit IS/NOT/UNCERTAIN tables with app section + entity + intent type signals | `AGENTS.md §Per-Turn C2` |
| P3 | No harness-violation complaint detection | C0 COMPLAINT CHECK + R16 Self-Improvement Protocol: detect → backfill → log CFP | `CLAUDE.md §R16`, `AGENTS.md §Per-Turn C0` |
| P4 | CFP logged but never acted on — no review cycle | `self_improve` skill: auto-called at session close, ranks patterns, proposes + executes harness changes | `self_improve/SKILL.md`, `skill-manifest.json` |
| P5 | No CFP baseline at boot — self_improve couldn't calculate new entries | B1 command outputs `CFP_COUNT: N` → stored as `cfp_boot_count` in working memory | `CLAUDE.md §Boot B1`, `AGENTS.md §Boot B1` |
| P6 | Session close skipped CFP review entirely | session_manager §3 Step 0: run self_improve before 5-file close sequence | `session_manager/SKILL.md §3` |

---

**Vulnerability Audit Fixes (V-Audit 2026-05-25) ◆**

| Q# | Vulnerability | Fix | Files Changed |
|---|---|---|---|
| Q1 | V6: CFP ID race condition — parallel agents write duplicate CFP numbers | I8 CFP ID pre-assignment (same pattern as T-IDs in I6) | `INVARIANTS.md §I8` |
| Q2 | V10: cfp_boot_count lost after /compact → false "all CFPs new" | Persist `cfp_boot_count` in session_handoff.md at TOKEN PAUSE; self_improve §1 reads fallback from handoff | `session_manager/SKILL.md §2`, `self_improve/SKILL.md §1` |
| Q3 | V20: self_improve §4 could edit itself → stale loaded version | §4 Invariants: MUST NOT edit self_improve/SKILL.md → emit [blocked-self-edit] → present to user | `self_improve/SKILL.md §4 Invariants` |
| Q4 | V2: "ลืม" false-positive on feature requests | C0 qualifier: "ลืม" only triggers if object is a harness step name, not a feature/component | `CLAUDE.md §R16`, `AGENTS.md §C0` |
| Q5 | V3: C0 resolved but C2 topic-switch not re-evaluated | R16 step 6: after backfill → re-run C1-C2-C3 with original message explicitly | `CLAUDE.md §R16` |
| Q6 | V4: backfill impossible if context no longer available | R16 step 3: context insufficient → ask user for missing info before proceeding | `CLAUDE.md §R16` |
| Q7 | V11: regex `CFP-[0-9]` misses CFP-10+ in recurrence grep | Changed to `CFP-[0-9]+` in self_improve §2 Step 2 | `self_improve/SKILL.md §2` |
| Q8 | V16: repeated deferrals — pattern never fixed | Escalation after 3 deferrals + "dismiss" option; deferred_count persisted in session_handoff.md | `self_improve/SKILL.md §3` |
| Q9 | V18: §4 did not update harness_flow after fix | §4 Step 5: append Q# row to harness_flow Patch table | `self_improve/SKILL.md §4` |
| Q10 | CFP-011: skipped mece_plan.md and created implementation_plan.md directly | Extended MECE Plan Constraint description in CLAUDE.md to halt and create mece_plan.md first | `CLAUDE.md §Loop Architecture` |
| Q11 | Agent full-reads index JSONs + CLAUDE.md in Phase 1 G2 (~14k wasted tokens) | Never-Full-Load list + Full-Read whitelist added; gather_complete.md + mece_plan.md session-date hook | `CLAUDE.md §R5`, `AGENTS.md §Never-Full-Load`, `~/.claude/settings.json` |
| Q12 | No precomputed read_hint in indexes — agents grep-hunt before every Read | Enrich indexes with `line_end`, `read_hint`, `keywords` via `symbol_indexer.py`; add T0 `lookup.py` oracle before T1–T3 grep tiers | `scripts/symbol_indexer.py`, `scripts/lookup.py`, `editor/SKILL.md §T0`, `CLAUDE.md §R5` |
| Q13 | No session history searchable — agents can't find prior fix attempts for same feature/bug | `session_indexer.py` builds `index_sessions.json`; `lookup.py --session` searches it; wired into editor R9 Step 2.5, coder §1, session_manager §2 Step 1a, self_improve §2 Step 4.5 | `scripts/session_indexer.py`, `scripts/lookup.py`, `knowledge/index_sessions.json`, `editor/SKILL.md §R9`, `coder/SKILL.md §1`, `session_manager/SKILL.md §2`, `self_improve/SKILL.md §2` |
| Q14 | Three hook gaps: (a) Read tool no hook → Never-Full-Load bypassed silently; (b) mece_plan.md gate checked existence only, not content → empty/minimal plan passed; (c) no wrong-filename detection for plan files | PostToolUse Read hook (warns + injects [never-full-load VIOLATION] when protected file read); PreToolUse updated with Verify-N count gate (≥2 required); PostToolUse Write hook (warns on *plan*.md outside .sessions/mece_plan.md); CFP-001–004 archived to cfp_archive.md (active=15) | `~/.claude/settings.json §PostToolUse (Read+Write)`, `knowledge/cfp_archive.md` |


---

**Round 2 Vulnerability Fixes (2026-05-25) ◆**

| R# | Vulnerability | Fix | Files Changed |
|---|---|---|---|
| R1 | NC1: Infinite C0 loop — Q5 caused original message re-triggering C0 | `c0_resolved` flag in working memory: set after backfill, C0 checks and clears flag before re-entry | `CLAUDE.md §R16`, `AGENTS.md §C0` |
| R2 | NC2: session_handoff.md overwrite clears cfp_deferred / cfp_dismissed | session_manager §3 Step 3.5: read-merge CFP fields before Write; Step 4 schema includes all CFP fields | `session_manager/SKILL.md §3` |
| R3 | NH1: B1 CFP_COUNT storage unenforceable — no visible gate | Boot reply line 1 mandatory field `· CFP: N` — visible output enforces extraction | `CLAUDE.md §Boot`, `AGENTS.md §Boot` |
| R4 | NH2 + V13: §2 "top pattern" biased to old recurrence count, ignores session CFPs | Priority queue: P1 = current session CFPs first; P2 = historical by recurrence | `self_improve/SKILL.md §2` |
| R5 | NH3: CFP "Detection signal:" not validated — future C0 misses recurrences | R16 Step 2.5: validate keyword against C0 signal list; rewrite if absent | `CLAUDE.md §R16` |
| R6 | V15: "silence > 1 turn" incorrectly deferred pending proposals | Silence → `pending_proposal` in handoff → re-present next session; only explicit "skip" defers | `self_improve/SKILL.md §3` |
| R7 | V21: No test that proposed fix catches original violation | §3 Step 2.5 dry-run: validate proposal against original complaint; max 2 revisions; `[proposal-mismatch]` if fails | `self_improve/SKILL.md §3` |
| R8 | V23: §4 edits without checking INVARIANTS.md conflicts | §4 Step 0.5: grep INVARIANTS.md for conflict → `[blocked-invariant]` + user confirm | `self_improve/SKILL.md §4` |
| R9 | V24: §4 runs every session — harness bloat | §4 Step 0 cooldown gate: skip if ran ≤ 2 sessions ago; exception for recurrence ≥ 5 or explicit request | `self_improve/SKILL.md §4` |
| R10 | NS1: No rollback if §4 edit breaks harness | §4 Step 0.6: backup file before edit; restore on verify failure | `self_improve/SKILL.md §4` |
| R11 | NS2: No audit trail of §4 executions | §4 Step 6: append `SI-N` entry to `.sessions/self_improve_log.md` | `self_improve/SKILL.md §4` |

---

**Phase 1 Enforcement Patches (2026-05-25) ●**

| E# | Gap | Fix | Files Changed |
|---|---|---|---|
| E1 | Agent read SKILL.md at B3, treated it as Phase 1, skipped G1-G2-G3 entirely | Added ⚠️ warning after Boot Reply line 1: "Boot ending ≠ ready to work" | `AGENTS.md §Boot`, `harness_flow §Boot` |
| E2 | No mandatory "Phase 1 next" gate after C3 routing | Added ⚠️ warning after C3: "After C3 → MANDATORY Phase 1 next. No exceptions." | `AGENTS.md §Per-Turn`, `harness_flow §Per-Turn` |
| E3 | No text gate in CLAUDE.md between Boot and Phase 3 | Added `§MANDATORY BOOT GATE` + `§PHASE TRANSITION GATE` sections | `CLAUDE.md` |
| E4 | No infrastructure enforcement — agent could skip mece_plan.md | PreToolUse hook: denies `src/` Edit if `.sessions/mece_plan.md` absent | `~/.claude/settings.json` |
| E5 | No session-start reminder of critical flow | SessionStart hook: injects 5-step flow (Boot→C0-C3→Phase1→Phase2→Phase3) at start | `~/.claude/settings.json` |
| E6 | No per-turn reminder of boot requirement | UserPromptSubmit hook: injects boot reminder every turn via `additionalContext` | `~/.claude/settings.json` |
| E7 | No record of failed fix approaches — agent retried same approach on recurring errors | R9 Step 0: Recurring Fix Detection (signals + prior roadmap check) + `### Failed Approaches:` field in ERR entries + mandatory write before R13 escalate | `CLAUDE.md §R9`, `knowledge/error_index.md` |
| E8 | mece_plan.md from prior session passed PreToolUse hook — agent skipped Phase 1+2 entirely | Session-scoped hook: checks `date -r mece_plan.md` = today, not just file existence | `~/.claude/settings.json §PreToolUse` |
| E9 | Phase 1 had zero infrastructure enforcement — advisory text only | Phase 1 completion marker: `[✓ gather]` must write `.sessions/gather_complete.md`; hook checks both files for today's date | `AGENTS.md §G3`, `CLAUDE.md §PHASE TRANSITION GATE`, `~/.claude/settings.json` |
| E10 | Sub-agents spawned without harness context — no constraints on src/ edits | Harness Context in Sub-agent Prompts: execution agents MUST include `constraints:` block (roadmap check, gather/mece files, index sync, db-gate) | `AGENTS.md §Sub-agent Rules R4` |
| E11 | Agent full-read protected files during Phase 1 G2 (CLAUDE.md 438L, index_files.json 764L, CODING_FAILURE_PATTERNS.md 308L, roadmap 191L) — wasted ~14k tokens | Explicit Never-Full-Load list with Violation signal + Full-Read whitelist (only SKILL.md/small src/sessions OK) | `CLAUDE.md §R5`, `AGENTS.md §Never-Full-Load` |

---

**Token Efficiency Improvements (2026-05-25) ◈**

| T# | Issue | Fix | Files Changed |
|---|---|---|---|
| T-078 | Sub-agent prompt bloat — full context injected per agent | Delegation Contract: constraints=rule numbers, context_files=paths only ≤5, cycle_context ≤5 bullets ≤150c, prompt ≤800 tok | `agent/SKILL.md` |
| T-078 | cycle_context grew unboundedly across cycles | Spawn Context Gate: >2k chars → summarize further | `agent/SKILL.md`, `session_manager/SKILL.md` |
| T-078 | History entries stored full tool output | Hard limits: action ≤20w, result ≤30w, summary_context cap 2k | `session_manager/SKILL.md` |
| T-079 | B3 loaded all context_files at boot (~21k tokens) | B3 loads sections[] ONLY · context_files = on-demand lookup | `AGENTS.md §Boot B3` |
| T-079 | Skill re-read on every TOKEN PAUSE resume | Conditional reload: skip if skill unchanged (compare cached skill_name) | `AGENTS.md §Phase 3`, `session_manager/SKILL.md §2` |
| T-079 | mece_plan.md no size cap | Plan size caps: ≤5 steps, ≤2 verify commands, ≤120 lines total | `mece/SKILL.md` |
| T-080 | B2 always read skill-manifest.json in full (~1,300 tok) | B2 skip if `skill:` in prompt · else grep keywords only | `AGENTS.md §Boot B2`, `skill-manifest.json` |
| T-080 | index_variables.json / index_files.json read in full | Never-Full-Load rule: grep only · NEVER Read these files in full | `AGENTS.md §Index Files` |
| T-080 | skill-manifest used context_files as auto-load list | skill-manifest v2.1: renamed to on_demand_files with `when` + `how` policy per file | `skill-manifest.json` |
| T-081 | G1 identified missing context per-section incrementally | Hybrid front-loaded: G1 scans ALL sections in 1 pass · G2 batch greps · user ask = 1 message max | `AGENTS.md §Phase 1` |
| T-082 | Phase 3 tool results accumulated in context | [L4.5] PURGE step: drop raw tool results after each verify, keep verdict + artifact only | `AGENTS.md §Phase 3` |
| T-082 | Sub-agent R4 section verbose, duplicated CLAUDE.md | R4 section slimmed from 14 → 7 lines | `AGENTS.md §R4` |
| T-082 | CODING_FAILURE_PATTERNS.md grows without bound | CFP Archive Gate: CFP >20 → archive oldest to `knowledge/cfp_archive.md`, keep 15 active | `self_improve/SKILL.md §1` |

---

**CFP Tracking + Harness Doctor Patches (2026-05-26) ●**

| H# | Change | Files Changed |
|---|---|---|
| H1 | CFP fix tracking index: occurrence log, fix history, group classification | `knowledge/index_cfp_fix.json` (new) |
| H2 | R16 logging enhanced: write occurrence + model + date to index_cfp_fix.json | `CLAUDE.md §R16` |
| H3 | Session close Step 0.5 (mece_plan Verify-N audit, fast-only) + Step 0.6 (fix date-compare) | `session_manager/SKILL.md §3` |
| H4 | self_improve §2 Step 2.5: group analysis from index · Step 5: group_summary + recurred flag in emit | `self_improve/SKILL.md §2` |
| H5 | harness_doctor skill — 5 sections: Diagnosis → Audit → Proposal → Gate → Execute | `.agents/skills/harness_doctor/SKILL.md` (new) |
| H6 | skill-manifest: harness_doctor entry + keywords + auto_trigger from self_improve §2.5 | `.agents/skills/skill-manifest.json` |
| H7 | Never-Full-Load: index_cfp_fix.json (full_ok ≤30 entries · grep-only beyond 30) | `AGENTS.md §Never-Full-Load` |
| H8 | INVARIANTS.md I8: index_cfp_fix.json race condition — orchestrator-only write rule | `INVARIANTS.md §I8` |
| H9 | Checkpoint boxes CK1-CK6 at all phase transition points (mece_plan state validation) | `harness_flow_20260526.md` (this file) |

**Phase-Checklist + Token Checkpoint Patches (2026-05-26) ◆**

| W# | Change | Files Changed |
|---|---|---|
| W1 | mece_plan.md Phase-Checklist Template: Phase 0-3 blocks with Files Read tables + TOKEN CHECK commands at every phase boundary | `mece/SKILL.md §Phase-Checklist Template` · `AGENTS.md §Phase 2 M5-M6` · `CLAUDE.md §PHASE TRANSITION GATE` |
| W2 | Plan Format fields: explicit `Tool:` + `Data_Sent: Thai ___ch \| ENG: ___ch` + `Token: ___k` per section — explicit tool name increases agent compliance | `mece/SKILL.md §Plan Format` |
| W3 | Phase 0 persistence rules: [X] items stay on same-session resume · reset only when session_manager creates new mece_plan.md | `mece/SKILL.md §Phase-Checklist Template §Phase 0 persistence rules` |
| W4 | /compact mandatory at task complete: Phase 0 carry-forward (skill_name + CFP_COUNT + task) written to session_handoff.md BEFORE compact · G0 restore step reads it back after compact | `CLAUDE.md §PHASE TRANSITION GATE` |
| W5 | PostToolUse Edit hook: TOKEN CHECK after mece_plan.md Edit — warns agent if ___k fields remain unfilled before sections are marked [X] | `~/.claude/settings.json §PostToolUse` |

**MECE Constraints Block + Size Index + Structure Gate Patches (2026-05-26) ◆**

| X# | Change | Files Changed |
|---|---|---|
| X1 | MECE Constraints Block added to 9 skills: editor/coder/file_manager/variable_manager/session_manager/agent/ascii_flow/harness_doctor/self_improve | `.agents/skills/*/SKILL.md §MECE Constraints Block` |
| X2 | mece/SKILL.md Execution Protocol [S1-D]: copy MECE Constraints Block from SKILL.md into plan section Constraints: field at M5 write | `.agents/skills/mece/SKILL.md §Execution Protocol` |
| X3 | mece/SKILL.md Plan Format + 4 Templates: Constraints: field added per section — required at plan creation | `.agents/skills/mece/SKILL.md §Plan Format §Templates` |
| X4 | AGENTS.md §Phase 2 M5: Constraints: field required — missing Constraints: = incomplete plan | `AGENTS.md §Loop Architecture §Phase 2` |
| X5 | knowledge/index_files.json: size field (lines/th_chars/en_chars/~tokens) auto-populated via symbol_indexer.py update_file_sizes() | `scripts/symbol_indexer.py` · `knowledge/index_files.json` |
| X6 | file_manager/SKILL.md: Entry Format with size object + size field rules + read strategy from ~tokens + MECE Constraints Block | `.agents/skills/file_manager/SKILL.md` |
| X7 | mece/SKILL.md Execution Protocol [S1-E]: post-write structure validation — Constraints: count = section count, Phase 0 block present, Tool: count matches | `.agents/skills/mece/SKILL.md §Execution Protocol` |
| X8 | session_manager/SKILL.md Step 0.5d: structure check at session resume — validate Constraints:/Phase 0/Tool: counts | `.agents/skills/session_manager/SKILL.md §Step 0.5` |
| X9 | settings.json PostToolUse Write hook: structural validation of mece_plan.md on Write — warns for missing Constraints:/Tool:/Phase 0 | `~/.claude/settings.json §PostToolUse` |
| X10 | mece/SKILL.md Plan Format: Token: ___k fill timing note — fill AFTER section completes, not at plan creation | `.agents/skills/mece/SKILL.md §Plan Format` |

15 CFPs backfilled into index_cfp_fix.json with group classification.
harness_doctor auto-triggered by self_improve §2.5 when recurred_after_fix[] not empty.

---

**TOKEN CHECK Fix Patch (2026-05-27) ◆**
| Patch | Change | Files Changed |
|---|---|---|
| X11 | TOKEN CHECK format: write SESSION_TOTAL from working memory to file BEFORE reading (was: cat only → always read 0). Format: `printf "SESSION_TOTAL: ___k\n" > .sessions/session_tokens.md` (fill ___k from memory) · then `cat`. Label: "(runtime · NOT at plan creation)" | `.agents/skills/mece/SKILL.md §Phase-Checklist Template §Token Check` |
| X12 | CLAUDE.md R1 write events: added "TOKEN CHECK point (write working memory SESSION_TOTAL before reading)" to the write-to-file events list | `CLAUDE.md §R1` |
| X13 | token_tracker/SKILL.md write events: added TOKEN CHECK point as 4th write event with note "do NOT rely on stale file value" | `.agents/skills/token_tracker/SKILL.md §Write Events` |
| X14 | AGENTS.md §M5: TOKEN CHECK runtime note — leave `→ ___k` as placeholder · do NOT evaluate at plan creation · fill at runtime only | `AGENTS.md §Phase 2 M5` |

Root cause: `session_tokens.md` was only written at token pause (>60k) / blocked / completion gate. Most tasks never hit 60k → file always 0 → TOKEN CHECK reads 0 → plan shows 0k throughout. Fix: write working memory value to file at each TOKEN CHECK point before reading.

**Pre-fill + ~Tok Formula Fix Patch (2026-05-27) ◆**
| Patch | Change | Files Changed |
|---|---|---|
| X15 | mece/SKILL.md Phase-Checklist Template header: added ~Tok formula note (`EN_ch × 0.3 / 1000` · `TH_ch × 1.7 / 1000` · NOT `chars ÷ 1000`) + Pre-fill rule (leave ALL `___` as-is at plan creation, fill at runtime only) | `.agents/skills/mece/SKILL.md §Phase-Checklist Template` |
| X16 | mece/SKILL.md completion gate SESSION_TOTAL line: added note "fill ___k from working memory · do NOT hardcode 0k at plan creation" | `.agents/skills/mece/SKILL.md §Phase 3 close block` |

Root cause X15-X16: Agent was computing ~Tok as `chars ÷ 1000` (overcounting 3×) and pre-filling numeric values (0k, 0ch) at plan creation time. Both issues traced to missing explicit formula + missing "leave as placeholder" rule in the template header.

**Boot mece/SKILL.md + Resume Read + Compact Notification Patches (2026-05-27) ◆**
| Patch | Change | Files Changed |
|---|---|---|
| X17 | AGENTS.md Boot B3: Also read `.agents/skills/mece/SKILL.md` offset=31 limit=110 → §Plan Format + §Execution Protocol (S1-A→S1-E) loaded at boot — agent knows required plan fields BEFORE Phase 1; NEVER re-read mid-session | `AGENTS.md §Boot B3` |
| X18 | AGENTS.md Boot resume read: when pending > 0, `grep -n "^\- \[ \]\|^\- \[/\]" .sessions/mece_plan.md` → find first pending item → determine resume phase (Phase 2 vs Phase 3) → Read mece_plan.md at that block (offset=N limit=40) for context | `AGENTS.md §Boot` |
| X19 | mece/SKILL.md Phase 3 close block: /compact line → after compact, agent notifies user: "compact เรียบร้อยครับ session ใหม่เริ่มได้เลย ไม่ต้องรัน /compact เอง" | `.agents/skills/mece/SKILL.md §Phase 3 close block` |
| X20 | Implement docs sync (2026-05-27): harness_flow B3 diagram + Token Tracking formula · 03_config.md B3 (2 locations) · 04_skills.md TOKEN CHECK format · 06_orchestrator.md mece_plan.md schema (full rewrite to Phase-Checklist Template format) | `Implement/03_config.md` · `Implement/04_skills.md` · `Implement/06_orchestrator.md` · `knowledge/harness_flow_20260526.md` |

**compact_state.md — Read-once-per-chat System (2026-05-27) ◆**
| Patch | Change | Files Changed |
|---|---|---|
| X21 | compact_state.md format: 3-line machine-readable file (dt/s/task/cfp · sk/sk_h/mece_h · p1/p2/p3). Written at session close BEFORE /compact (while session memory intact). B1 reads it next task — same-day dt= → [compact-restore] → B2/B3 skip framework file reads → saves ~2.9k tokens | New file: `.sessions/compact_state.md` |
| X22 | AGENTS.md B1/B2/B3 updated: B1 adds compact_state.md check; B2 adds [compact-restore] branch (parse sk=, skip manifest); B3 adds [compact-restore] branch (sha1 check sk_h/mece_h, skip SKILL.md reads if match). Full-Read whitelist: added compact_state.md. Bullet note: saves ~2.9k tokens per session restart | `AGENTS.md §Boot B1-B3 + §Never-Full-Load` |
| X23 | session_manager/SKILL.md Step 5.3: write compact_state.md before /compact (Step 5.5). mece/SKILL.md Phase 3 close + mece_plan.md template: added compact_state.md write checkbox. CLAUDE.md: Boot note + R5 Full-Read + Phase 3 close step 2 added. Implement/03_config.md: B1/B2/B3 updated (both occurrences). harness_flow: Layer 3 + Boot diagram + patch table updated | `session_manager/SKILL.md` · `mece/SKILL.md` · `.sessions/mece_plan.md` · `CLAUDE.md` · `Implement/03_config.md` · `knowledge/harness_flow_20260526.md` |
| X24 | .gitignore: added session runtime files (compact_state.md · gather_complete.md · cycle_*.json · context_compact_*.md) — prevent accidental commits. session_manager MECE Constraints Block: added Step 5.3 entry. harness_flow CK1: added compact_state.md checkbox. Implement/06 Phase 0 table + Implement/08 B1/B2/B3 checklist items updated | `.gitignore` · `session_manager/SKILL.md §MECE Constraints Block` · `harness_flow §CK1` · `Implement/06_orchestrator.md` · `Implement/08_checklist.md` |

---

**Harness Upgrade — claw-code Patterns (2026-05-27) ◇**

| Y# | Change | Files Changed |
|---|---|---|
| Y1 | `[M1.5]` extended reasoning pass added to Phase 2 between M1→M2: dependency_map[] + risk_flags[] + outcome_sketch[] in working memory (≤600 tokens · feeds Cycle grouping + Verify-N) | `AGENTS.md §Phase 2` · `harness_flow §Phase 2` |
| Y2 | OmO Role Assignment table added to Sub-agent R4: Architect(sonnet)/Executor(sonnet)/Reviewer(haiku) · Reviewer spawns at Completion Gate (read-only, PASS/FAIL output) | `AGENTS.md §Sub-agent R4` · `agent/SKILL.md §step 7` · `harness_flow §Completion Gate` |
| Y3 | `[S1-A.5]` added to mece Execution Protocol between S1-A→S1-B: mirrors M1.5 at skill level | `mece/SKILL.md §Execution Protocol` |
| Y4 | M1.5 checkbox added to Phase-Checklist Phase 2 block; Sections[] steps list updated; Cycle grouping annotated with M1.5 source; Multi-skill S1[B] references M1.5 dependency_map[] | `mece/SKILL.md §Phase-Checklist` · `§Sections[]` · `§Plan Format` · `§Multi-skill template` |
| Y5 | `lookup.py` upgraded: `source` field (index_variables/index_files/index_sessions/rag) in all 3 search functions · `RAG_BASE_URL` env var + `_rag_query()` stub · `.claw-rag/` added to .gitignore · CLAUDE.md R5 T0 updated with source + --session + RAG_BASE_URL note | `scripts/lookup.py` · `.gitignore` · `CLAUDE.md §R5` |
