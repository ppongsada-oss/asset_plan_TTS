# CLAUDE.md — Hard Constraints & Gateway

> Read first. Every AI agent, no exceptions.
> Destructive gates + DB stop → **INVARIANTS.md** · Repo structure → **REPO_MAP.md**

## ⚡ MANDATORY BOOT GATE
**Behavior Contract — Boot Gate (fires before ANY response):**
```
Pre:    `[Boot]` trace not yet emitted this session
Contract: STOP all work → run B1→B2→B3 → emit [Boot] trace → then respond
          skipping boot = invalid session state = CFP violation
Post:   `[Boot]` trace emitted · session state initialized · safe to proceed
Enforce: response without [Boot] trace = [violation] boot-gate → re-run B1-B3 + emit trace immediately
```

## Boot (3 tool calls max)
→ Full B1/B2/B3 + compact-restore: **AGENTS.md §Boot Sequence**
Reply: `**[Boot]** Thread: <done|in_progress> · Tasks: <N> · Skill: <name> · Sections: <N> · Tokens: ~<N>k · CFP: <N>`
After task → write `.sessions/active_thread.md`: `task: · phase: done|in_progress|blocked · next:`

## Per-Turn Routing (every message — before any work)
Run C0→C1→C2→C3. → Full logic + topic switch criteria: **AGENTS.md §Per-Turn Routing**

## Loop Architecture
→ Full Phase 1–3 detail + REACT LOOP: **AGENTS.md §Loop Architecture**

## ⚡ PHASE TRANSITION GATE (hard — no exceptions)
**Behavior Contract — Phase Transition (fires before ANY Edit/Write to `src/`):**
```
Pre:    about to call Edit or Write tool targeting src/ path
Contract: check gather_complete.md + mece_plan.md → both dated today · mece has Phase 0-3 blocks + user confirmed
          both present → proceed · either missing → STOP → run missing phase first
          Boot ≠ Phase 1 · Phase 1 = G1 greps + G2 reads + G3 assess + [✓ gather] emitted
Post:   Edit/Write to src/ proceeds only after both files verified for today's date
Enforce: PreToolUse hook checks both files · missing = tool call blocked · emit [phase-gate-blocked] → run missing phase
```
**Behavior Contract — Phase 3 Close Sequence (fires when all mece_plan.md sections marked [X]):**
```
Pre:    all Phase 3 sections marked [X] in mece_plan.md · about to end task
Contract: step 0: verify all [X] · step 1: Write session_handoff.md (skill_name + CFP_COUNT + task)
          step 2: Write compact_state.md (dt/sk/sk_h/mece_h/p3/section/step) BEFORE /compact · reset LOOP_WEIGHT=0 in session_tokens.md
          step 3: run /compact — ALWAYS · step 4: PATH A clear mece_plan.md Phase 1-3 (NEVER ad-hoc · CFP-025)
          → Completion Gate BC: AGENTS.md §Phase 3
Post:   compact_state.md written · /compact run · mece_plan.md Phase 1-3 cleared (Phase 0 kept)
Enforce: skip any step = [violation] BC-phase3-close → complete missing steps before /compact
```

## R1 · Token Tracking
Two counters: `SESSION_TOTAL` (per-task, resets at B1) · `CHAT_TOTAL` (context window, resets only on /compact)
→ Full formulas + JSONL + spike alerts: **Implement/03_config.md §Token Tracking**
Each turn: (1) compute (2) SESSION_TOTAL += (3) CHAT_TOTAL += (4) write JSONL (5) check R3 (6) check spike (7) footer

Footer: → use [token-state] hook values DIRECTLY · absent → grep session_tokens.md · NEVER estimated · write SESSION_TOTAL BEFORE footer · skip write = CFP-028 · format: `*(Turn: N · Loop_W: N | Session: ~NNNk | Chat: ~NNNk tokens)*` · Loop_W stale = CFP-031 · display 4-bucket when SESSION_TOTAL > 5k: `[sys:Nk tools:Nk hist:Nk out:Nk]`
→ after footer: if cache_hit_pct < 60% AND cache_read_tokens > 0: emit `[cache-warn] hit%: NN% (target ≥60%) · recommend /compact before next task` · skip = R1 violation

## R2 · Tool Budget
Max 5 tool calls/turn. Retry max 2×; diagnose on 2nd fail.

## R3 · Session Pause Protocol
→ Full threshold table: **Implement/03_config.md §R3**
Key: SESSION_TOTAL >60k → TOKEN PAUSE · >80k → /compact · >90k → HALT (hard) · CHAT_TOTAL >80k → [compact-rec] strong (primary · recommend+choice) · >120k → HALT (hard) · LOOP_WEIGHT >50 → [compact-rec] light hint (secondary)

## R4 · Sub-agent Decision
Probe: `find <path> -name "<pat>" | wc -l` → <5 files/<300L: main context · ≥5: spawn sub-agent (≤500 tok)
Spawn: read `spawn_tool` from `detected.md` · platform-unknown → run B4 first
→ Spawn patterns + Phase routing table (~35% cost saving): **AGENTS.md §Sub-agent Rules** · **Implement/03_config.md §R4**

## R5 · Index-First Lookup (hard)

→ before Read: emit `[pre-read] Target: <symbol> · Tier: T<N> · Line: <N>` · after Read: emit `[post-read] Verdict: relevant|partial|irrelevant` · irrelevant → DROP · before Edit symbol: emit `[pre-edit] Symbol: <name> · used_in: <N> · safe: yes|review` · skip any emit = [violation] R5

## Never-Full-Load (hard — no exceptions)

Never-Full-Load: prohibited files → grep/offset only:
- CLAUDE.md → NEVER re-read · index_variables.json / index_files.json → grep ONLY
- CODING_FAILURE_PATTERNS.md → grep -c + offset=N limit=30 · docs/master_roadmap.md → grep -n or tail -30
- INVARIANTS.md → on-demand R14/R15 only · error_index.md → grep → ≤40L · index_cfp_fix.json → full ok ≤30 entries
- Full-Read ok: SKILL.md ≤80L · src/ ≤80L · active_thread.md · session_handoff.md · compact_state.md · REPO_MAP.md
→ full Read of prohibited file = [violation] never-full-load → discard → re-run as grep

## R6–R7 · Output + Density
R6: `cmd 2>&1 | grep -iE "error|warn|fail" | tail -20` · R7: table/bullet > prose · comparison→table · steps→numbered · enum→bullet

## R8 · Index Sync (fire on file changes)

→ after file create/delete/move: update index_files.json + backlink_analyzer.py · edit imports → backlinks[] · symbol create/rename → symbol_indexer.py · session close → session_indexer.py · emit `[r8-sync-check]` · skip = [violation] R8-index-sync

## R9 · Error Protocol
Step 0: "still broken"/"same error"/same ERR-XXX → grep roadmap prior AttemptID → read `### Failed Approaches:` → different approach → `[recurring] ERR-XXX · Prior: N · Previous: <summary> · New: <different>`
Pre-debug: grep error_index.md · index_variables.json · index_files.json
New error: `T-{Parent}-{BugID}-{Attempt}` · write error_index + `### Failed Approaches:`

→ before new error_index.md entry: grep error_topics.md for topic id · no match → emit `[topic-missing]` · add topic first · then write entry · entry without topic: field = [violation] BC-topic-lookup
→ when error_index entry has it_work:false: read failed_approaches: → choose approach NOT in list · emit `[active-fix] ERR-XXX · Avoiding: <prior> · Trying: <new>` · debug without reading failed_approaches = [violation] BC-active-fix

## R10–R11 · Tool Cap + English
R10: Truncate at 300 lines · >50L offload → `.sessions/exec_log/<uuid>.txt` · terse signals only
→ Re-insertion rule + Offload detail + Output Contracts: **Implement/03_config.md §R10**
R11: `.sessions/`, `knowledge/`, comments, commits → English only. Thai: user replies only.

## R12 · Post-Edit Verification

→ after Edit/Write: src/ → re-read changed section · DB change → verify no ERR-007 · file create/delete → index_files.json updated · error fix → ERR-XXX in error_index + roadmap [X] · step marked [X] without checks = [violation] R12

## R13 · Escalation

→ on 2nd failed attempt OR tool error 2× OR R12 fail 2×: HALT · emit `[blocked] Task: <T-ID> · Attempts: 2 · Cause: <root> · Need: <missing>` · wait for user · 3rd attempt without [blocked] = [violation] R13

## R14 · Destructive Action Gates

**Behavior Contract — Destructive Gate (fires before delete/overwrite/batch actions):**
```
Pre:    about to delete/overwrite src/ or knowledge/ · OR any src/db/ edit · OR batch >5 files
Contract: MUST emit [gate] signal and HALT — no execution until explicit user confirm received
          emit: [gate] Action: `<what>` · Scope: `<files>` · Risk: `<why>` · Waiting: confirm
Post:   action proceeds ONLY after user types explicit confirmation
Enforce: destructive action without [gate] emit + confirm = [violation] R14 → HALT · re-emit [gate] immediately
```

## R15 · DB Hard Stop

**Behavior Contract — DB Gate (fires on any src/db/ edit or DB-column type change):**
```
Pre:    about to edit any file under src/db/ OR modify a TS type that includes DB column fields
Contract: HALT immediately — emit [db-gate] signal and wait for explicit "yes"
          emit: [db-gate] File: `<path>` · Symbol: `<name>` · Change: `<what>` · DB impact: `<tables>` · → Waiting for explicit "yes"
Post:   DB edit proceeds ONLY after user types explicit "yes" (not just "ok" or "continue")
Enforce: any src/db/ write without [db-gate] + explicit "yes" = [violation] R15 → HALT · REVERT · re-emit [db-gate]
```

## R16 · Self-Improvement (C0 detection)
Signals: "ทำไมไม่ทำตาม" · "you skipped" · "didn't log" · "ลืม" + harness step name → emit `[self-improve] Rule: <R-N> · Missed: <what>` → execute missed step → emit `[✓ backfilled]`
→ **MANDATORY same-response tool call:** Edit `CODING_FAILURE_PATTERNS.md` — `## CFP-<N+1>`: Symptom/Root/Prevention/Detection/topic:<id>/count:0/recurrences:[]
→ After Edit: `grep -c "^## CFP-" CODING_FAILURE_PATTERNS.md` → count = N+1 · emit `[✓ CFP-<N+1>]`

**Behavior Contract — Doctor Flow (fires immediately after [self-improve] emit, same response):**
```
Pre:    [self-improve] emitted this turn
Contract: MUST run doctor flow BC-A → BC-B → BC-E before ending response:
  BC-A: python3 check index_cfp_fix.json for approved_proposal≠"" + status=approved
        → found: emit [resume] CFP-N → skip to §5
  BC-B: ⚠️ FIND EXISTING TOPIC FIRST — never create new CFP/topic without exhausting search
        STEP 1: grep knowledge/index_cfp_fix.json for terms related to the current symptom
                → match found (description or recurrences align conceptually with current symptom): emit [cfp-match] CFP-N · log recurrence → skip to BC-E
        STEP 2: IF no match in index_cfp_fix.json → grep knowledge/cfp_topics.md keywords[]
                → topic aligns conceptually with current symptom: emit [keyword-match] topic: <id> · proceed to CODING_FAILURE_PATTERNS.md check
        STEP 3: IF no topic match → proceed to BC-C (AI judge confidence ≥ 0.7)
        STEP 4: ALL fail → emit [new-topic-proposed] + HALT for confirm (BC-D)
        ⚠️ Creating new CFP without completing STEP 1-4 = [violation] BC-B-skip → revert CFP · re-run STEP 1
  BC-E: append recurrence entry to index_cfp_fix.json on matched entry
        count++ → threshold check:
          count ≥ 5 → emit [fix-escalated] CFP-N · topic: <id> · count: N
          count ≥ 3 → emit [fix-required] CFP-N · topic: <id> · count: N
          count < 3 → emit [recurrence-logged] CFP-N · topic: <id> · count: N
Post:   one of [recurrence-logged] / [fix-required] / [fix-escalated] emitted
        SAME response as [self-improve] — never deferred to next turn
Enforce: [self-improve] without completing BC-A→BC-E = CFP-015 recurrence
         detection: grep response for [recurrence-logged]\|[fix-required]\|[fix-escalated]
                    after every [self-improve] — missing = violation → re-run immediately
```

## R-Roadmap · Log Before Starting
`[ ] T-<N>: desc · [ ]→[/]→[X]` · grep before creating — no dupes · Completion: `[X] T-N: desc (→ERR-XXX) · attempts:N · tool_calls:N`

## Knowledge Base Paths
`knowledge/index_files.json` · `index_variables.json` · `error_index.md` · `docs/master_roadmap.md` · `INVARIANTS.md` · `REPO_MAP.md` · `.sessions/session_*.json` · `CODING_FAILURE_PATTERNS.md`

@AGENTS.md
