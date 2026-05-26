<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

<!-- BEGIN:agent-orientation -->
# Agent Orientation — Read Before Acting

You are operating inside the **Asset Plan** project. Rules apply to ALL agents regardless of vendor.

> **Full hard constraints → `CLAUDE.md` (You MUST read this file first and strictly follow all of its principles)** · **Destructive gates → `INVARIANTS.md`** · **Repo structure → `REPO_MAP.md`**

---

## Boot Sequence (3 tool calls max)

```
[B1] Bash: (phase=$(grep "^phase:" .sessions/active_thread.md 2>/dev/null | awk '{print $2}'); [ "$phase" != "in_progress" ] && printf "SESSION_TOTAL: 0\n" > .sessions/session_tokens.md; cat .sessions/active_thread.md 2>/dev/null | tail -4; echo "---"; cat .sessions/session_tokens.md 2>/dev/null; echo "---"; grep -n "\[/\]" docs/master_roadmap.md 2>/dev/null | head -3; echo "---"; echo "CFP_COUNT: $(grep -c '^## CFP-' CODING_FAILURE_PATTERNS.md 2>/dev/null || echo 0)")
[B2] IF incoming prompt contains `skill: <name>` (orchestrator pre-resolved):
       → use that skill_name directly · SKIP manifest read (saves ~1,300 tokens)
     ELSE:
       → Bash: grep -B1 -A6 '"keywords"' .agents/skills/skill-manifest.json | head -80
         Match user intent against keywords[] → identify skill_name
         → Cache skill_name in working memory · NEVER re-read manifest this session
[B3] Read: .agents/skills/<skill_name>/SKILL.md offset=1 limit=80
     → load sections[] ONLY · cache in working memory
     → on_demand_files from manifest = lookup table for G2, NOT loaded at boot
     → NEVER auto-load on_demand_files at B3 — they are read on-demand during G2 only
     → NEVER re-read SKILL.md mid-session unless skill changes (check cached skill_name first)
```

- B1 auto-resets SESSION_TOTAL to 0 when phase ≠ in_progress
- Load CFP_COUNT from B1 output → store as `cfp_boot_count` in working memory
- If SESSION_TOTAL > 50k → run Mid-Session Compact (non-blocking — see CLAUDE.md R3)
- If SESSION_TOTAL > 60k → warn user before proceeding
- If mece_plan.md exists with pending sections → skip Phase 1+2 → resume Phase 3 at pending section
  (pending = `grep -cE "^\- \[[ /]\]" .sessions/mece_plan.md 2>/dev/null || echo "0"` > 0)
  **Resume staleness gate (V3) — run after B3 only when phase = in_progress:**
  `git status --short src/ 2>/dev/null | grep -c "." || echo "0"` → src/ changes since last session?
  Compare `mece_plan_hash` in `.sessions/session_handoff.md` vs `sha1sum .sessions/mece_plan.md 2>/dev/null | cut -d' ' -f1`
  → Hash mismatch OR src/ changes > 0 → emit `[plan-stale]` · ask: "src/ changed since plan was created — reconfirm MECE plan or rebuild Phase 2?"
  → Hash matches AND no src/ changes → proceed to Phase 3 directly

Reply line 1: `**[Boot]** Thread: <done|in_progress> · Tasks: <N open> · Skill: <name> · Sections: <N> · Tokens: ~<N>k · CFP: <cfp_boot_count>`

> ⚠️ **Boot ending ≠ ready to work.** After Reply line 1 → run C0–C3 routing → then Phase 1.
> Reading SKILL.md at B3 is NOT Phase 1. SKILL.md = template. Phase 1 = actual code context.
> Do NOT touch src/ until [✓ gather] AND [✓ MECE] are emitted.

---

## Per-Turn Routing (every user message)

**Run C0 → C1 → C2 → C3 before any work. No exceptions.**

```
[C0] if c0_resolved = true in working memory → clear flag → skip to C1 immediately ◆
     COMPLAINT CHECK — does user message signal a harness violation? (R16 CLAUDE.md)
     Signals: "ทำไมไม่ทำตาม" · "you skipped" · "didn't log" · "harness says"
     "ลืม" qualifier: ONLY triggers if object is a harness step name
       (roadmap, error_index, CFP, index, pre-read, session, boot, skill, gate, MECE)
       "ลืมบอกให้เพิ่ม X" = feature request → NOT C0 → pass to C1 normally
     → YES → INTERRUPT normal routing → run R16 self-improve sequence → resume C1 with original message
     → NO → continue to C1

[C1] READ active_thread.md → extract `task:` field (current topic)
[C2] COMPARE new user request topic vs task: field
     → Same topic / continuation / follow-up on same task? → C3 (stay)
     → Different topic (new feature, unrelated bug, new area)? → TOPIC SWITCH → close first
[C3] ROUTE based on C2:
     └─ TOPIC SWITCH detected →
          (a) Emit: [topic-switch] Current: `<task>` · New: `<topic>` · Closing session first
          (b) Route → session_manager §3 (5-file close sequence + SESSION_TOTAL reset to 0)
          (c) Only AFTER session closed → start Phase 1 fresh for new topic
          Do NOT carry previous context or SESSION_TOTAL into the new task
     └─ Same topic →
          Check skill match (table below) → re-read SKILL.md ONLY if skill changes (compare to cached skill_name)
```

**Topic switch — IS a new topic (close session first) if ANY of these match:**
| Signal | Example |
|---|---|
| Different app section | was: `site-plan` → now: `admin`, `center`, `matrix-report`, `profile` |
| Different primary entity | was: fixing `job` → now: working on `user`, `plan`, `request`, `report` |
| Different intent type | was: debugging/fixing → now: building new feature (or vice versa) |
| Different feature goal | was: "add filter to list" → now: "build approval flow" (unrelated) |
| Names different route/page | new message names a different `src/app/` path than current task |
| Unrelated "ลืม บอก" | "ลืม บอกให้แก้ X ด้วย" where X has no connection to current task |

**Topic switch — NOT triggered by:**
| Signal | Why it's still the same task |
|---|---|
| "also fix" / "while you're there" | Same context, additive request |
| "also update" / "add X to that form" | Extending current task |
| Revision of approach | "do it differently" / "use X instead" — same goal |
| Adding constraint | "make sure it handles null / Thai locale / mobile" |
| Bug found inside current work | Direct consequence of work in progress |
| "ต่อ" / "keep going" / "continue" / "ไปต่อ" | Explicit continuation signal |
| Question about current output | "why did it do X?" — still on same task |
| Second part of stated compound task | User said "first X then Y" at task start — Y is not a switch |

**Uncertain — default: ASK (do not silently switch or silently stay):**
- Different component but same feature concept → ask: "นี่เป็น task เดิมหรือ task ใหม่ครับ?"
- Bug touches adjacent component not in current scope
- Message is ambiguous (could be follow-up OR new task)
→ Emit: `[topic-unclear] ขอยืนยัน — นี่ต่อเนื่องจาก <current task> หรือเป็นงานใหม่ครับ?`
→ Wait for answer before routing

| Situation | Action |
|---|---|
| User asks to fix a bug (different area) | Topic switch → close → `editor` |
| User says "ปิด session" | Route → `session_manager` |
| User asks to create a new file (new task) | Topic switch → close → `coder` |
| Same task, same area | Stay on current skill |
| Same task, skill changes | Re-read SKILL.md · stay in session |

**Same session ≠ same skill. Same message ≠ same topic.** Always run C1–C3 first.

> ⚠️ **After C3 (any branch) → MANDATORY: Phase 1 next. No exceptions.**
> Knowing the skill (from B3) does NOT satisfy Phase 1. You still must:
> `G1 scan sections → G2 grep + targeted reads → G3 assess → emit [✓ gather]`
> Then Phase 2: build MECE plan → user confirms → write mece_plan.md → emit [✓ MECE]
> Then Phase 3: REACT LOOP on src/
> **Shortcut = blocked.** PreToolUse hook will deny src/ Edit if mece_plan.md absent.

---

## Loop Architecture

**Phases 1–2 run ONCE per task. On resume: skip to Phase 3 at pending section.**

| Phase | What happens |
|---|---|
| 1 Info Gather | G1 scan ALL sections at once → G2 batch greps → G3 assess · user ask = 1 message max · emit [✓ gather] |
| 2 MECE Plan | Build plan (1:1 Skill sections) → Verify-N per section → user confirms → roadmap |
| 3 Execution | REACT LOOP: Select → Execute → Observe → Verify → Decide |

---

### Phase 1 · Info Gather Loop

Goal: gather enough context to cover ALL Skill sections before planning — in as few turns as possible.

```
GATHER LOOP — Hybrid front-loaded model:
│
│   [G1] SCAN ALL sections at once (front-loaded — one pass, not per-section):
│        For EACH section in Skill sections[]:
│          □ What file/symbol does this section need?
│          □ Is it available via index grep, or does it require user input?
│        Output: missing_files[] + missing_user_input[]
│        → missing_user_input not empty?
│            Compile COMPLETE list → ask user ONCE (single message, all items)
│            NEVER ask user mid-loop for individual items
│            Wait for reply → restart G1 with new info
│        → missing_files only?
│            Proceed to G2 immediately
│
│   [G2] BATCH RETRIEVE (all at once — not one-by-one):
│        Run ALL needed greps in one Bash call (pipe multiple greps) → get line numbers
│        Then: targeted Read per found item (offset+limit, never full file)
│        After EACH Read → emit [post-read] verdict immediately (R5 — no exceptions)
│          `irrelevant` → drop from context NOW, do NOT carry into Phase 2
│          `partial`    → keep excerpt only (note L<N>–L<N>) · discard rest
│          `relevant`   → keep in working context
│        Read without verdict = CFP-004 violation → emit [violation] → backfill before continuing
│
│   [G3] ASSESS — context_sufficient requires ALL of:
│        □ Every Skill section has ≥1 resolved file path or symbol
│        □ Every Skill section has a draft Verify-N criterion (what "done" looks like)
│        □ No unresolved "?" placeholders remain in working notes
│        If all □ checked → emit [✓ gather] → write `.sessions/gather_complete.md` (date: YYYY-MM-DD) → EXIT to Phase 2
│        If □ unchecked due to new dependency found in G2 reads → loop G1 once more (max 2 extra loops)
│
└─ Token check: SESSION_TOTAL > 60k → PAUSE before starting next loop iteration
```

**Gather hard limits:**
- G1 scan: 1 pass covers ALL sections — never scan section-by-section
- G2 batch: all greps in ONE Bash call where possible → min tool calls
- User asks: max 1 ask per Phase 1 run, contains ALL missing items — never incremental
- Max loops: 3 total (G1→G2→G3 = 1 loop) — stops at 3 regardless
- Loop 1 resolves most tasks · Loop 2 for discovered dependencies · Loop 3 = final only

After 3 loops without `[✓ gather]`:
→ HALT gather loop
→ Emit `[gather-stalled]` Missing: `<complete list across all sections>`
→ Ask user once: "ขาด context ต่อไปนี้ทั้งหมด: <list> — ช่วยระบุได้ไหมครับ?"
→ Do NOT proceed to Phase 2 until user provides or explicitly says "proceed anyway"

---

### Phase 2 · MECE Plan (once — skip if existing plan on resume)

```
[M1] Read: .agents/skills/mece/SKILL.md offset=1 limit=100  ← format + rules section only, skip examples
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
│   │   [L4.5] PURGE → drop this step's tool results from working context
│   │                  keep only: [✓ written] verdict + artifact path + Verify-N result
│   │                  NEVER carry raw tool output forward to next step
│   │   [L5] DECIDE
│   │        section_done REQUIRES both:
│   │          (a) [✓ written] grep verification passed for this section's output
│   │          (b) Verify-N criterion from MECE plan passed (run or checked)
│   │          Missing either → FAIL → retry (count toward 2-attempt limit)
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
│   → On confirm:
│       Reload config (conditional):
│         skill unchanged (check `skill_name` in working memory) → sections[] still in context · SKIP re-read
│         skill changed → Read new SKILL.md offset=1 limit=80 → re-cache
│       MECE: reuse if plan hash unchanged · rebuild Phase 2 if scope changed
│       Reset to pending section · open REACT LOOP
│
└─ Continue to next section (Config stays loaded — no reload unless resuming)
```

---

### Completion Gate

Agent may NOT report done until all pass:

**Token Check (run first):**
- SESSION_TOTAL > 50k AND compact not yet run? → compact first → then run Completion Gate checks
- SESSION_TOTAL > 60k? → TOKEN PAUSE before Completion Gate

```
□ All N Skill sections executed (tool calls — not just described in text)
□ Every write/edit has [✓ written] grep verification
□ R8 Index Sync done (if files/symbols changed)
□ R-Roadmap entries → [X]
□ active_thread.md → phase: done
□ SESSION_TOTAL written → .sessions/session_tokens.md
□ Feedback & Error Summary delivered to user (errors/retries listed + CFP if new pattern found)
```
→ Any box unchecked → continue Phase 3 · never report done prematurely

---

## Backlink Rule

Before editing any file:
```bash
grep -A 6 '"src/path/to/file.tsx"' knowledge/index_files.json
```
Check `backlinks[]` — every file listed imports the file you are about to edit. Update all of them.
→ Full dependency rules: **REPO_MAP.md** · Gates: **INVARIANTS.md**

---

## Never-Full-Load (Hard Rule — no exceptions, including Phase 1 G2)

```
CLAUDE.md                       (in context at boot)    → NEVER re-read · already in working memory
knowledge/index_variables.json  (755 lines, ~5,400 tok) → grep ONLY · NEVER Read full
knowledge/index_files.json      (763 lines, ~5,500 tok) → grep ONLY · NEVER Read full
CODING_FAILURE_PATTERNS.md      (grows over time)       → grep -c "^## CFP-" · Read offset=N limit=30 per entry ONLY
docs/master_roadmap.md          (180+ lines)            → grep -n "T-NNN" or tail -30 · NEVER full Read
INVARIANTS.md                   (134 lines)             → on-demand ONLY when R14/R15 gate fires · not at boot
knowledge/error_index.md        (grows over time)       → grep -n "^## ERR" → Read offset=N limit=40 ONLY
```

**Full-Read whitelist (only these files may be read in full):**
```
.agents/skills/*/SKILL.md       → B3 load with offset=1 limit=80 cap
src/*.tsx / src/*.ts            → Phase 1 G2 only AND file ≤80 lines (else grep+targeted)
REPO_MAP.md                     → on-demand for directory structure questions
.sessions/active_thread.md      → C1 routing check
.sessions/session_handoff.md    → resume flow only
```

**Violation:** Reading any Never-Full-Load file in full → emit `[violation] never-full-load` → discard result → re-run as grep.

**on_demand_files in skill-manifest:** lookup table, NOT an auto-load list.
G2 may access them only when that file is needed for the current section — grep first, targeted Read (offset+limit) only.
B3 MUST NOT load on_demand_files. No exceptions.

---

## Quick Reference

| Rule | Requirement |
|---|---|
| Token footer | Every response: `*(Session total: ~NNN tokens)*` |
| File reads | grep index first → emit [pre-read] → Read offset+limit=60 · skip [pre-read] = **[violation R5]** · discard result · grep first |
| Index JSONs | grep only — NEVER Read full (index_variables.json / index_files.json) |
| Symbol edits | grep index_variables → check used_in → emit [pre-edit] · skip [pre-edit] = **[violation R5-edit]** · HALT · check used_in first |
| Destructive actions | INVARIANTS.md §I1 — emit [gate] and wait confirm · load INVARIANTS.md on-demand only |
| DB changes | INVARIANTS.md §I2 — emit [db-gate] and HALT |
| Error protocol | R9: grep LOOKUP TABLE in error_index → ERR-XXX → `Read offset=N limit=40` only → symbol_index → file_index |
| Roadmap | Every task logged before execution. `[ ]` → `[/]` → `[X]` · never full-read at boot |
| Manual close | "ปิด/close/done" → route `session_manager` §3 — 5 file writes + SESSION_TOTAL reset to 0 |
| Token merge | After each Cycle N: sum `tokens_estimated` from cycle_N_*.json → add to SESSION_TOTAL → write session_tokens.md (§I7) |
| Retry persistence | Write `attempt_count: N` to session_handoff.md per section · restored on resume → 1 retry allowed if count=0 |
| Topic switch | New task = new session JSON — never carry raw History across tasks |

## Sub-agent Rules (R4)

| Pattern | When |
|---|---|
| Explore | ≥5 files / ≥300 lines → summary only |
| Execution | section >8 steps + isolated output |
| Parallel fan-out | ≥2 sections same Cycle → spawn simultaneously |
| Cycle transition | Cycle N done → TOKEN CHECK → inject → spawn N+1 |

- Max depth = 1 · output = `.sessions/cycle_N_<id>.json` · tokens → SESSION_TOTAL
- Pre-assign ALL T-IDs before spawn (I6) · emit `[cycle N]` before each spawn
- HALT: any section blocked → do NOT spawn next Cycle
- Prompt: Delegation Contract (`agent/SKILL.md`) — ≤800 tokens total
- Full rules: `CLAUDE.md §R4` · platform: `detected.md`

### Harness Context in Sub-agent Prompts

**Explore agents** (read-only): no harness constraints needed — cannot edit src/.

**Execution/Coder agents** (any src/ work): prompt MUST include a `constraints:` block:
```
constraints:
  - Roadmap: task T-<N> must be [/] before any edit — grep docs/master_roadmap.md first
  - No src/ edit without both gather_complete.md AND mece_plan.md written today
  - No new file without updating knowledge/index_files.json backlinks
  - No symbol create/rename without python scripts/symbol_indexer.py after edit
  - DB edits (src/db/): emit [db-gate] and halt — main agent must confirm
```

Missing `constraints:` block in execution sub-agent prompt = **CFP violation**.

---

## Reference Files

| File | Purpose |
|---|---|
| `INVARIANTS.md` | Destructive gates (I1) + DB hard stop (I2) + symbol check (I4) |
| `REPO_MAP.md` | Directory layers, protected zones, quick lookup commands |
| `CODING_FAILURE_PATTERNS.md` | Known agent failure modes (CFP-001+) |
| `knowledge/error_index.md` | ERR-XXX error log (search first before any debug) |
| `docs/master_roadmap.md` | Task checklist |
| `.agents/skills/ascii_flow/SKILL.md` | **Use when creating any flow diagram in a .md file** — style + templates |

---

## Critical Project-Specific Rules

- **Miniflare D1 (local):** No `onConflictDoNothing()` or multi-row INSERT — silent failures. Use SELECT+filter+single-row-insert. (ERR-007)
- **Edge Runtime:** No Node.js APIs. WebCrypto only.
- **CSV parsing:** Always PapaParse — never `split(",")` manually.
<!-- END:agent-orientation -->
