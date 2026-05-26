---
name: Session Manager
description: Handles TOKEN PAUSE, BLOCKED halt, session rotation, and resume flows. Maintains session JSON and active_thread.md.
---

## Sections
```
- id: 1
  name: "Session State"
  steps: ["check active_thread.md phase", "rotate or continue session JSON"]
- id: 2
  name: "Pause / Blocked Handling"
  steps: ["save state to session_handoff.md", "summarize progress", "ask user to continue or fix"]
- id: 3
  name: "Manual Close"
  steps:
    - "find and close current session JSON (status: completed + write summary_context)"
    - "write SESSION_TOTAL to .sessions/session_tokens.md"
    - "write active_thread.md → phase: done"
    - "write session_handoff.md if task was in_progress"
    - "confirm to user: list all files written"
```

---

# Session Manager

## Section 1 — Session State

### Session Rotation (new task or topic switch)
1. Open current `.sessions/session_xxx.json` → set `"status": "completed"` (or `"paused"`)
2. Write final summary into `"summary_context"`
3. Create new `.sessions/session_<NNN>_<topic>.json`:

```json
{
  "session_id": "session_003_master_data",
  "associated_tasks": ["T-007"],
  "status": "in_progress",
  "estimated_tokens": 0,
  "summary_context": "",
  "History": []
}
```

### Continuous Logging
After every interaction round → append to `History[]` in active session file.

**History entry format — hard limits:**
- `action`: ≤20 words (what was done)
- `result`: ≤30 words (outcome only — no file content, no tool output verbatim)
- NEVER store: raw file reads, full tool outputs, CLAUDE.md text, knowledge JSON content
- Tool outputs → store summary only: `"wrote <file>:<lines>"`, `"grep found <N> matches"`, `"build ok"`

**summary_context size cap:**
- Rolling Summary appends `"[Before: X] | [Added: Y]"` to `summary_context`
- If `summary_context` total chars > 2,000 → keep only last 3 entries → discard older
- `summary_context` is NEVER injected into sub-agent prompts — it is for session replay only

### Rolling Summary (every 5 turns — MANDATORY)
If History has ≥ 5 items:
1. Read oldest items (all except 4 most recent)
2. Summarize as: `"[Before: X] | [Added: Y]"` → append to `summary_context`
3. Delete old items → keep only 4 most recent in History
History never exceeds 5 items — reduces context fed to AI by ~70%.

**Hard enforcement before sub-agent spawn:** History MUST NOT exceed 5 items at spawn time.
If History count = 5 when about to spawn → compact first → then spawn. No exceptions.

### Smart Output Truncation
Tool outputs > 1,000 chars → keep first + last 20 lines, separated by `\n...[Truncated]...\n`

### Mid-Session Compact (SESSION_TOTAL > 50k) — NON-BLOCKING
Triggered automatically. Does NOT pause work or ask user.
```
1. Identify last 6 loop interactions (keep verbatim)
2. Summarize everything older than last 6 loops → ≤300 tokens
3. Write .sessions/context_compact_<N>.md:
   Fields:
     summary:    <key decisions, artifacts created, current state>
     keep_loops: <last 6 loop interactions>
     compacted_at: <SESSION_TOTAL at time of compact>
4. Emit [compact] Context: ~<N>k → compacted · keeping last 6 loops
5. Treat summary as new context anchor — old tool results no longer re-referenced
6. Continue task immediately — no interruption
```
**Compact cadence:** fires at >50k, then again at >60k (before TOKEN PAUSE check), then TOKEN PAUSE takes over at >60k if compact alone is insufficient.

---

## Section 2 — Pause / Blocked Handling

### TOKEN PAUSE (SESSION_TOTAL > 60k)
Triggered from Loop Phase 3 when token threshold hit.

```
1. Finish current loop step (do not stop mid-step)
2. Write .sessions/session_handoff.md:
   sections_done: [list]
   sections_pending: [list]
   last_step: <step name>
   latest_result: <last tool output summary — ≤50 chars, outcome only, no tool output verbatim>
   skill_name: <cached skill from working memory>    ← used by resume to skip B3 re-read
   attempt_count: <N>          ← retries used on current step (0 or 1)
   mece_plan_hash: <sha1>      ← run: sha1sum .sessions/mece_plan.md 2>/dev/null | cut -d' ' -f1
   cfp_boot_count: <N>         ← current cfp_boot_count from working memory (V10 fix)
3. Append to active session History with status "paused_token_limit"
4. Show user:
   "ทำเสร็จแล้ว <X>/<N> sections
    ค้างที่: Section <N> step <name>
    ดำเนินการต่อไหมครับ?"
5. On confirm:
   → Reload config (conditional): compare incoming skill_name vs handoff skill_name
       Same → sections[] cached in context · SKIP SKILL.md re-read
       Different → Read new SKILL.md offset=1 limit=80 → re-cache
   → Check MECE plan: reuse if state unchanged, rebuild if scope changed
   → Reset loop to pending section → continue Phase 3
```

### BLOCKED (step failed after 2× retry)
Triggered from Loop Phase 3 when verify or observe fails twice.

```
1. HALT all remaining sections immediately
2. Write .sessions/session_handoff.md with status "blocked":
   blocked_cycle: N
   cycle_results_available: [.sessions/cycle_N_S1.json, ...]   ← list completed result files
3. Show user:
   "ติดปัญหาที่: Section <S> step <name>
    สาเหตุ: <cause>
    ทำสำเร็จแล้ว: [sections_done]
    ยังค้างอยู่: [sections_pending]
    แก้ก่อนดำเนินการต่อ หรือ skip section นี้?"
4. Wait for user decision:
   → Fix: user resolves → reload → resume from blocked section
   → Skip: mark section [/] with note → continue to next section
```

### Resume Flow
```
1. Read .sessions/session_handoff.md → load sections_done + sections_pending + last_step
- Load `attempt_count` from handoff (field added by CHANGE 2):
  - `attempt_count: 1` → this step already used 1 retry → next failure = BLOCKED immediately
  - `attempt_count: 0` or missing → full retry budget (1 retry allowed)
  - Emit `[resume-attempt] count=<N>` so agent knows remaining budget
1a. Session history lookup (run if session_id is in handoff):
    python scripts/lookup.py "<task from handoff>" --session --json
    → find the session JSON that matches this task
    → Read that .sessions/session_NNN.json → check `files_changed[]` and `History[]`
    → inject as brief bullet context: "Prior session changed: <file list> · Last action: <action>"
    → skip if lookup returns empty or session file missing
1b. Read `.sessions/cycle_N_*.json` for the last completed Cycle (N = current_cycle from handoff)
    → inject as `cycle_context:` before spawning Cycle N+1 agents
**Resume Context Gate (run before injecting `cycle_context:`):**
- Count total chars across all `cycle_N_*.json` files to be injected
- If total > 1,500 chars: summarize each file to: `status`, `artifacts` (filename only), `notes` (≤80 chars)
- If total > 3,000 chars after summarize: keep most recent cycle only — drop earlier cycles
- Never inject raw file content from artifact paths — pass paths only
- Never inject: session History[], summary_context, knowledge/*.json, CLAUDE.md text
2. Reload config (conditional): compare `skill_name` in handoff vs `skill_name` in working memory
   Same skill → sections[] still in context · SKIP Read · emit [resume-config] cached
   Different skill → Read .agents/skills/<skill>/SKILL.md offset=1 limit=80 → re-cache
2b. MECE Staleness Gate (V3):
    Compare `mece_plan_hash` in handoff vs: `sha1sum .sessions/mece_plan.md 2>/dev/null | cut -d' ' -f1`
    Also check: `git status --short src/ 2>/dev/null | grep -c "." || echo "0"` — any src/ changes?
    → Hash mismatch OR src/ changes > 0 → emit [plan-stale] · ask: "MECE plan may be stale (src/ changed). Reconfirm or rebuild Phase 2?"
    → User confirms stale plan → proceed · User rebuilds → delete mece_plan.md · run Phase 2 again
    → Hash matches AND no src/ changes → proceed silently
3. MECE: load existing plan from handoff → reuse if valid · rebuild if scope changed
4. Emit [resume] trace
5. Open REACT LOOP at first pending section
```

---

## Section 3 — Manual Close (user says "ปิด session / close / จบงาน / done")

**Trigger:** User explicitly requests session end — NOT a token pause or blocked state.

**Step 0 — CFP Review (run BEFORE the 5 file writes):**
```
0a. Load self_improve SKILL.md (.agents/skills/self_improve/SKILL.md)
0b. Run self_improve §Section 1 (CFP Tally):
    current_count = grep -c "^## CFP-" CODING_FAILURE_PATTERNS.md
    new_cfps = current_count - cfp_boot_count (from working memory)
0c. If new_cfps = 0 → emit [cfp-skip] · skip to Step 1
    If new_cfps ≥ 1 → run self_improve §Section 2–3 (Pattern Analysis + Proposal)
    Wait for user response before proceeding to Step 1
    "skip" / "later" → emit [cfp-deferred] · proceed to Step 1
    "ทำเลย" / "yes" → run self_improve §Section 4 · then proceed to Step 1
```

**5 mandatory file writes — do NOT summarize without completing all:**

```
Step 1 — Find and close current session JSON
  Bash: ls -t .sessions/session_*.json | head -1    → identify active session file
  Read: active session file
  Edit: set "status": "completed"
  Edit: write "summary_context": "<what was accomplished this session>"

Step 2 — Reset session_tokens.md for next session
  Write: .sessions/session_tokens.md
  Content:
    SESSION_TOTAL: 0
  Note: Final token count goes into session JSON summary_context (Step 1) — this file resets to 0 so the next session starts clean

Step 3 — Write active_thread.md
  Write: .sessions/active_thread.md
  Content:
    task: <what was done this session>
    phase: done
    next: <next action if any, else "none">

Step 3.5 — Read-merge CFP state before writing session_handoff.md (NC2 fix ◆)
  Bash: grep -E "^cfp_deferred:|^cfp_dismissed:|^last_self_improve" .sessions/session_handoff.md 2>/dev/null
  → extract existing values (or use defaults: cfp_deferred: {} · cfp_dismissed: [] · last_self_improve_session: none)
  → merge with current session:
    cfp_deferred: merge keys, sum counts (do NOT reset)
    cfp_dismissed: union of lists (deduplicate)
    last_self_improve_session: keep if §4 did NOT run this session; update if it did
  → include merged values in Step 4 Write

Step 4 — Write session_handoff.md (ALWAYS — even if task is complete)
  Write: .sessions/session_handoff.md
  Content:
    status: completed
    session_id: <session_id>
    tasks_done: [list of T-IDs completed]
    tasks_pending: [list of T-IDs still open, or "none"]
    last_action: <final action taken>
    next_session_start: <what to do first next time>
    cfp_boot_count: <cfp_boot_count from working memory>
    cfp_deferred: <merged dict from Step 3.5>
    cfp_dismissed: <merged list from Step 3.5>
    last_self_improve_session: <session_id if §4 ran, else carry from Step 3.5>

Step 5 — Sync session index
  Bash: python scripts/session_indexer.py
  → updates knowledge/index_sessions.json with this session's keywords + summary
  → enables future lookup.py --session queries to find this session by topic or task ID
  Verify: grep -c "session_<NNN>" knowledge/index_sessions.json → ≥1

Step 6 — Confirm to user (list every file written)
  Reply format:
    ✅ Session ปิดแล้วครับ — ไฟล์ที่บันทึก:
    · .sessions/session_<NNN>_<topic>.json → status: completed
    · .sessions/session_tokens.md → SESSION_TOTAL: ~<N>k
    · .sessions/active_thread.md → phase: done
    · .sessions/session_handoff.md → next: <summary>
    · knowledge/index_sessions.json → session indexed
```

**Never report "session closed" before all 5 files are written.** Summary text alone = incomplete close.
