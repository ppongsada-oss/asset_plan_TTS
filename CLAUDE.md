# CLAUDE.md — Hard Constraints & Gateway

> Read first. Every AI agent, no exceptions. Rules here = hard constraints.
> Destructive-action gates and DB hard stop → see **INVARIANTS.md**.
> Repo structure and protected zones → see **REPO_MAP.md**.

## ⚡ MANDATORY BOOT GATE

**Before responding to ANY user message — verify `[Boot]` trace has been emitted this session.**

If `[Boot]` trace has NOT been emitted yet:
1. STOP — do not respond to the user message
2. Run B1 → B2 → B3 (Boot Sequence below, max 3 tool calls)
3. Emit: `**[Boot]** Thread: <done|in_progress> · Tasks: N · Skill: <name> · Tokens: ~Nk · CFP: N`
4. THEN respond to the user

**Skipping boot = invalid session state. Responding without `[Boot]` in first response = CFP violation.**

---

## Boot (3 tool calls max)
```
[B1] Bash: (phase=$(grep "^phase:" .sessions/active_thread.md 2>/dev/null | awk '{print $2}'); [ "$phase" != "in_progress" ] && printf "SESSION_TOTAL: 0\n" > .sessions/session_tokens.md; cat .sessions/active_thread.md 2>/dev/null | tail -4; echo "---"; cat .sessions/session_tokens.md 2>/dev/null; echo "---"; grep -n "\[/\]" docs/master_roadmap.md 2>/dev/null | head -3; echo "---"; echo "CFP_COUNT: $(grep -c '^## CFP-' CODING_FAILURE_PATTERNS.md 2>/dev/null || echo 0)")
[B2] Read: .agents/skills/skill-manifest.json → match user intent to keywords[] → identify skill_name
[B3] Read: .agents/skills/<skill_name>/SKILL.md → load sections[] and context_files
```
→ B1 resets SESSION_TOTAL=0 when phase≠in_progress · Load CFP_COUNT as `cfp_boot_count` in working memory · Warn if >60k
→ [B4] Platform Probe: if `detected.md` has `platform: unknown` → list tools → update · else skip

Reply line 1 — Boot trace:
```
**[Boot]** Thread: <done|in_progress> · Tasks: <N open> · Skill: `<name>` · Sections: <N> · Tokens: ~<N>k · CFP: <cfp_boot_count>
```
After any task → write `.sessions/active_thread.md`: `task: · phase: done|in_progress|blocked · next:`
→ Trace formats, gate-confirmation, violation handling → **AGENTS.md §Boot Sequence**

---

## Per-Turn Routing Check (every user message — before any work)

Run C0→C1→C2→C3 before any work. **Hard rule:** agent detects topic switch autonomously.
→ Full C0/C1/C2/C3 logic, topic switch criteria, routing table → **AGENTS.md §Per-Turn Routing**

---

## Loop Architecture — All Work Runs Through 3 Phases

| Phase | Summary |
|---|---|
| 1 Info Gather | G1→G2→G3 until sufficient · emit [✓ gather] · write `.sessions/gather_complete.md` |
| 2 MECE Plan | M1–M5 plan → user confirm → write `.sessions/mece_plan.md` · emit [✓ MECE] |
| 3 Execution | REACT LOOP L1–L5 · BLOCKED / TOKEN PAUSE handling · Completion Gate |

**Phases 1–2 run ONCE per task.** On resume: skip to Phase 3 at pending section.
→ Full Phase 1–3 detail → **AGENTS.md §Loop Architecture**

## ⚡ PHASE TRANSITION GATE (hard — no exceptions)

**Boot ending at B3 does NOT mean context is gathered. Boot loads HOW to work. Phase 1 gathers WHAT to work on.**

After Boot → before ANY Edit/Write to `src/`:
```
REQUIRED (in order):
  [✓ gather]  Phase 1 complete — G1+G2+G3 done · gather_complete.md written today
  [✓ MECE]   Phase 2 complete — plan confirmed by user · mece_plan.md written today
```
Missing either → **STOP** → run the missing phase → only then proceed.

**Reading SKILL.md at B3 is NOT Phase 1.** Phase 1 = grep indexes + targeted reads + [✓ gather] emitted.
**[✓ gather] MUST write `.sessions/gather_complete.md`** (date: YYYY-MM-DD) — hook checks both files for today's date.
**Writing mece_plan.md is NOT optional.** PreToolUse hook denies src/ Edit if either file missing or stale (not today).

---

## R1 · Token Tracking

Read session_tokens.md ONCE at Boot (B1) → SESSION_TOTAL in working memory. No per-turn file reads.
```
Input  = (user_msg_chars × 0.3) + context_overhead + (tool_result_tokens)
Output = (thai_chars × 1.7) + (en_chars × 0.3)
context_overhead: Turn 1 = ~4,000 | subsequent = 200 + (SESSION_TOTAL × 0.08)
```
Write to file ONLY at: token pause · blocked halt · completion gate. Emit `*(Session total: ~NNN tokens)*` every response.
→ Thresholds and pause rules → **R3** · audit → **token_auditor/SKILL.md**

---

## R2 · Tool Budget
Max 5 tool calls/turn. Retry max 2×; diagnose on 2nd fail.

---

## R3 · Session Pause Protocol
| SESSION_TOTAL | Action |
|---|---|
| >60k | finish current loop step → TOKEN PAUSE |
| >80k | `/compact` immediately → continue if <90k after |
| >90k | HALT immediately → save state → report to user |

---

## R4 · Sub-agent Decision

Scope probe before any task: `find <path> -name "<pat>" | wc -l` or `grep -rl "<kw>" src/ | wc -l`

| Probe | Action |
|---|---|
| < 5 files / < 300 lines | Proceed in main context |
| ≥ 5 files / ≥ 300 lines | Spawn sub-agent → summary ≤500 tokens |

Execution sub-agents MUST include `constraints:` block (roadmap, gather/mece files, index sync, db-gate).
→ Spawn patterns, hard limits, harness context template → **AGENTS.md §Sub-agent Rules R4**

---

## R5 · Index-First Lookup

**T0 (run before T1–T3):** `python scripts/lookup.py "<symbol or keyword>" --json`
→ Returns file + line + read_hint (offset/limit) + keywords · Skip if result empty → proceed to T1.

Emit BEFORE every Read: `**[pre-read]** Target: \`<symbol>\` · Tier: T<0|1|2|3> · Line: <N> · Will read: offset=<N> limit=60`
Emit AFTER every Read: `**[post-read]** File: \`<path>\` · Verdict: relevant|partial|irrelevant`
Emit BEFORE every symbol Edit: `**[pre-edit]** Symbol: \`<name>\` · used_in: <N files> · safe to edit: <yes|needs review>`
Skip any gate = `[violation] R5` → discard result → re-run. `irrelevant` verdict → DROP from context immediately.

**Never-Full-Load (no exceptions — including Phase 1 G2):**
`CLAUDE.md` (in memory — never re-read) · `index_files.json` / `index_variables.json` (grep only) · `master_roadmap.md` (grep or tail -30) · `CODING_FAILURE_PATTERNS.md` (grep count + targeted Read ≤30L) · `INVARIANTS.md` (on-demand gate only) · `error_index.md` (grep → Read ≤40L)
Violation → emit `[violation] never-full-load` → discard result → re-run as grep.

**Full-Read permitted only:** `.agents/skills/*/SKILL.md` (B3, ≤80L cap) · `src/` ≤80L Phase 1 G2 · `.sessions/active_thread.md` · `.sessions/session_handoff.md` · `REPO_MAP.md`
→ Lookup tiers T1/T2/T3, blast-radius check → **editor/SKILL.md** · **AGENTS.md §Never-Full-Load**

---

## R6 · Output Filter
Pipe all Bash: `cmd 2>&1 | grep -iE "error|warn|fail" | tail -20`

---

## R7 · Response Density
Default: table/bullet > prose. Comparison → table · Steps → numbered list · Enumeration → bullet.

---

## R8 · Index Sync
| Event | Action |
|---|---|
| Create/delete/move file | Update `knowledge/index_files.json` + backlinks |
| Edit file (add/remove imports) | Update backlinks in `knowledge/index_files.json` |
| Create/delete/rename symbol | Update `knowledge/index_variables.json` + `python scripts/symbol_indexer.py` |
| Session close (session_manager §3) | `python scripts/session_indexer.py` → updates `knowledge/index_sessions.json` |

---

## R9 · Error Protocol

**Step 0 — Recurring Fix Detection (run FIRST):**
Signals: "ยังไม่หาย" · "แก้แล้วยัง" · "still broken" · "same error" · "กลับมาอีก" · "fix ไม่ผ่าน" · "ยังเจออยู่"
OR: same ERR-XXX already [X] in roadmap / same T-N-BugID referenced
→ grep roadmap for prior AttemptID → read `### Failed Approaches:` in ERR entry → choose DIFFERENT approach
→ Emit: `[recurring] ERR-XXX · Prior attempts: N · Previous: <summary> · New: <different>`

⚠️ **3 checks BEFORE any debug:**
1. `grep -n "^## .*keyword" knowledge/error_index.md | head -1` → `Read offset=N limit=40`
2. `grep -A 8 '"symbol"' knowledge/index_variables.json`
3. `grep -A 8 '"file"' knowledge/index_files.json`

New error: `T-{Parent}-{BugID}-{Attempt}` · roadmap `[ ]`→`[/]`→`[X] (→ERR-XXX)` · write error_index entry with `### Failed Approaches:` field.
On R12 verify fail → write `### Failed Approaches:` BEFORE escalating per R13.

---

## R10 · Tool Result Cap
Truncate all tool results at 300 lines. >300 lines → grep/filter relevant section only.

---

## R11 · English-first Analysis
Session files (`.sessions/`), `knowledge/`, comments, commit messages → English only. No Thai in agent-written files.
Reasoning >5 steps: English outline → Thai for user-facing summary only.

---

## R12 · Post-Edit Verification

| Action type | Verify by |
|---|---|
| Edit src/ file | Re-read changed section · check no broken imports |
| DB schema change | No ERR-007 violations (no multi-row insert, no onConflictDoNothing, no float in int) |
| Create/delete file | `knowledge/index_files.json` updated + backlinks resolved |
| Error fix | ERR-XXX in `knowledge/error_index.md` + roadmap `[X]` |

Never report done before verification passes.

---

## R13 · Escalation Protocol
AttemptID=02 / tool error 2× / R12 FAIL twice / >60k unresolved → emit and halt:
`[blocked] Task: <T-ID> · Attempts: 2 · Cause: <root cause> · Need: <what is missing>`

---

## R14 · Destructive Action Gates
Emit `[gate]` and wait confirm before: delete/overwrite `src/` or `knowledge/` · any `src/db/` edit · batch ops >5 files · any action outside current roadmap task scope.
`[gate] Action: \`<what>\` · Scope: \`<files>\` · Risk: \`<why>\` · Waiting: confirm`

---

## R15 · DB Structure Hard Stop
Any edit to `src/db/` or TS type with DB column fields → HALT until explicit "yes":
`[db-gate] File: \`<path>\` · Symbol: \`<name>\` · Change: \`<what>\` · DB impact: \`<tables>\` · → Waiting for explicit "yes"`

---

## R16 · Self-Improvement Protocol (User Complaint Detection)

Treat as **C0 harness complaint** if message contains:
- "ทำไมไม่ทำตาม" / "ไม่ได้ทำตาม" + harness context
- "ลืม" + harness step name (roadmap/CFP/boot/MECE/gate/pre-read/index/skill) — NOT feature/component names
- "ไม่ได้บันทึก" / "ไม่ได้ log" / "ไม่ได้ update" + (roadmap|error_index|index|CFP)
- "why didn't you follow" / "you skipped" / "you forgot" + rule/step reference
- "harness says" / "CLAUDE.md says" / "rule says" + implied violation

On detection (before resuming original task):
1. Emit `[self-improve] Rule: <R-N> · Missed: <what>`
2. Execute missed step NOW (ask user if context insufficient, then wait)
3. Emit `[✓ backfilled] <what done>`
4. Log CFP: `grep -c "^## CFP-"` → N+1 → append entry (Symptom · Root cause · Prevention · Detection signal)
5. Set c0_resolved=true → re-run C0→C1→C2→C3 with original user message

→ CFP entry format, archive gate, pattern analysis → **self_improve/SKILL.md §CFP Logging Format**

---

## R-Roadmap · Log All Work Before Starting

| Work type | Format |
|---|---|
| New feature | `[ ] T-<N>: description` |
| Bug fix | `[ ] T-{Parent}-{BugID}-{AttemptID}: description` |
| Sub-task | `  - [ ] T-<N>.{sub}: description` |
| Re-attempt | Increment AttemptID |

`[ ]` → `[/]` → `[X]` · grep roadmap before creating — never duplicate T-IDs.
Completion: `[X] T-N: desc (→ ERR-XXX) · attempts: N · tool_calls: N`

---

## Knowledge Base Paths
```
knowledge/index_files.json      ← backlinks for all files (lookup before edit)
knowledge/index_variables.json  ← symbols + line numbers (lookup before edit)
knowledge/error_index.md        ← ERR-XXX codes (search before debug)
docs/master_roadmap.md          ← task checklist
.agents/skills/registry.md      ← skill routing table
.sessions/session_*.json        ← active session state
INVARIANTS.md                   ← destructive gates + DB hard stop (I1–I7)
REPO_MAP.md                     ← directory structure + dependency rules
```

---

@AGENTS.md
