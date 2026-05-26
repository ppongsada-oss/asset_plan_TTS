# CODING_FAILURE_PATTERNS.md — Known Agent Failure Modes

> Each pattern: what happened, why it broke, how to prevent it.
> Add new patterns after post-mortems. Never delete entries.
> CFP-001–CFP-004 archived → knowledge/cfp_archive.md (2026-05-26)

---

## CFP-005 · Skipping MECE Plan / Modifying Code Without Plan Alignment

**Symptom:** Agent starts modifying or creating source files without first creating, updating, or aligning on a MECE plan (`.sessions/mece_plan.md` or similar). This leads to missed constraints, incorrect file edits, and tool/procedural violations.

**Root cause:**
- Attempting to speed up execution by skipping Phase 2 (MECE Plan) of the Loop Architecture.
- Initiating file modifications during the info-gathering or diagnostics phase before the planning gates are cleared.

**Prevention:**
1. Under Loop Phase 2, always build a section-based plan that maps 1:1 to target Skill sections.
2. Document this plan in `.sessions/mece_plan.md` before making any source code edits.
3. Ensure the user confirms the plan or has explicitly approved the roadmap before starting execution (Phase 3).

---

## CFP-006 · Unbounded Loop → Token Exhaustion

**What happened:** Agent entered a loop (Phase 1 gather, verify-retry, or skill re-route) with no exit condition. It repeated the same tool calls until SESSION_TOTAL reached the halt threshold.

**Why it broke:** Three root causes:
1. Phase 1 Info Gather Loop had no iteration cap — agent kept judging context "insufficient" and re-reading the same files
2. Retry counter not persisted in session_handoff.md — after resume, retry budget reset to 0, allowing infinite retry across sessions
3. Skill re-route had no cycle guard — A→B→A→B re-routing possible without depth limit

**Prevention:**
- Phase 1: max 3 gather iterations → `[gather-stalled]` + ask user (see CLAUDE.md)
- Retry: write `attempt_count` to session_handoff.md → restore on resume (see session_manager/SKILL.md)
- Re-route: compare target skill vs previous section's skill → skip if same (see CLAUDE.md re-route guard)
- Verify: non-empty output ≠ pass — must match defined condition (see mece/SKILL.md)

---

## CFP-007 · Using Local Date/Time APIs Without Gregorian Safety → Buddhist Year Corruption

**Symptom:**
In applications where dates are compared as strings (`YYYY-MM-DD` or `YYYY-MM`), or stored in the database in Gregorian format, client browsers configured to use local calendars (such as the Thai Buddhist calendar, common in Thailand) will return the local year (e.g. `2569`) instead of the Gregorian year (e.g. `2026`) via `new Date().getFullYear()` or `date.toLocaleDateString()`. This causes comparison logic to break (evaluating `2569 > 2026` as true) or writes corrupted Buddhist era dates into the database.

**Root cause:**
- `new Date().getFullYear()` returns the local calendar year on client browsers like Safari on iOS/macOS when the device calendar is set to Buddhist.
- Using simple string splitting or standard date APIs without enforcing a Gregorian/ISO calendar formatting.

**Prevention:**
1. Never use `new Date().getFullYear()` directly to get a Gregorian year for database/API communications or configurations.
2. Use safe utilities that adjust timezone and force UTC methods (like `utcAdjustedDate.getUTCFullYear()`) or format explicitly using `Intl.DateTimeFormat("en-US", { calendar: "gregory" })`.
3. In this project, use `getLocalGregorianString(new Date())` from `src/lib/date-utils.ts` and parse the year from it.

---

## CFP-008 · MECE Plan Staleness on Resume → Edits Target Wrong Lines

**Symptom:** Agent resumes from a previous session and executes Phase 3 on an old MECE plan. Source files were modified externally between sessions (git pull, manual edit). Agent edits wrong line numbers or targets renamed/moved symbols.

**Root cause:**
- Resume flow checks only for pending sections in mece_plan.md (grep count > 0)
- No validation that source files match the state when the plan was created
- Stale line numbers in plan → Edit tool targets wrong context → corrupts file

**Prevention:**
1. Session handoff must store `mece_plan_hash: <sha1 of mece_plan.md at plan creation>`
2. On resume: compare stored hash vs `sha1sum .sessions/mece_plan.md | cut -d' ' -f1`
3. If hash mismatch OR `git status --short src/` shows changes → emit [plan-stale] → ask user
4. User confirms stale plan → proceed · User says rebuild → run Phase 2 again

**Detection signal:** `[plan-stale]` trace emitted at resume

---

## CFP-009 · Parallel Sub-agent Token Accounting Gap → Missed Threshold Triggers

**Symptom:** Session runs parallel fan-out (≥2 sub-agents). After Cycle completes, SESSION_TOTAL reads ~45k but actual total is ~72k. 60k threshold never fires. Session continues past safe limit silently.

**Root cause:**
- Sub-agents estimate tokens independently with no merge coordination
- Orchestrator receives cycle results but does not add sub-agent `tokens_estimated` to SESSION_TOTAL
- Each parallel Cycle widens the gap — SESSION_TOTAL is increasingly stale

**Prevention:**
1. Sub-agent result file must include `tokens_estimated: N` (estimate of that sub-agent's total)
2. Orchestrator: after reading all cycle_N_*.json → sum `tokens_estimated` → add to SESSION_TOTAL
3. Write updated SESSION_TOTAL to session_tokens.md immediately (INVARIANTS.md §I7)
4. Apply R3 threshold check after every merge

**Detection signal:** SESSION_TOTAL suspiciously low after a multi-agent Cycle despite large output volume.

---

## CFP-010 · Skipping Loop Architecture Phases 1 & 2 (Info Gather & MECE Plan)

**Symptom:** Agent jumps to proposing an overall implementation plan artifact without running the Loop Architecture's Phase 1 Info Gather loop (checking files, verifying constraints) and Phase 2 MECE Plan (creating mece_plan.md with 1:1 section mapping and DoD verify criteria).

**Root cause:**
- Attempting to accelerate the task by jumping straight to a high-level design plan instead of strictly executing the MECE-structured planner in `.sessions/mece_plan.md`.
- Conflating the agent-facing MECE plan / task.md tracking with user-facing implementation plans.

**Prevention:**
1. Always follow the Loop Architecture: repeat Info Gather (Phase 1) until context is sufficient, then build a MECE Plan (Phase 2) mapping 1:1 to the target Skill sections in `.sessions/mece_plan.md`.
2. Define a clear `Verify-N` command/criterion for each section in the DoD.
3. Obtain explicit user confirmation on BOTH plan steps and verify criteria before execution (Phase 3).

**Detection signal:** User message complains with "ทำไมไม่ทำตามกระบวนการ" or "you forgot" + missing step name.

---

## CFP-011 · Creating Implementation Plan Artifact Before MECE Plan Approval (Recurrence of CFP-005/CFP-010)

**Symptom:** Agent creates the user-facing `implementation_plan.md` artifact before writing and obtaining approval for the section-based `.sessions/mece_plan.md`.

**Root cause:**
- Jumping directly to the final `implementation_plan.md` design artifact under planning mode rules, while violating the strict harness constraint that requires `.sessions/mece_plan.md` to be created and approved first.

**Prevention:**
1. Under Loop Phase 2, always write the MECE plan to `.sessions/mece_plan.md` first.
2. Never create or edit `implementation_plan.md` or any source code before the MECE plan is approved.

**Detection signal:** User message contains "ทำไมไม่ทำ mece_plan" or "ทำไมไม่ทำตาม" or "rule says" + "mece_plan".

---

## CFP-012 · Skipping MECE Plan for Bug Fixes and Follow-up Tasks

**Symptom:** Agent skipped Phase 2 MECE Plan for a bug fix/follow-up request on an approved task, and immediately edited source files without user permission or confirmation.

**Root cause:**
- Misinterpreting the "minor follow-up" planning exemption and failing to generate a MECE plan when the user requested to follow the process ("ตามกระบวนการของเราเลย mece plan").

**Prevention:**
1. If the user explicitly asks to follow the MECE plan process or complains about a missing plan, always build a `.sessions/mece_plan.md` first.
2. Never skip MECE planning for bugs that involve multi-component integration (such as DB API and React state routing).

**Detection signal:** User message contains "ทำไมไม่วางแผน mece มา" or "ทำไมไม่ทำตามกระบวนการ".

---

## CFP-013 · Omitting Harness Trace Tokens During Implementation → Silent Execution

**Symptom:** Agent executes multi-step tasks (Read, Edit, Write, Bash) without emitting required trace tokens. User sees only results — no `[pre-read]`, `[post-read]`, `[✓ written]`, or `[loop]` markers in responses.

**Root cause:**
- Agent shifts into "implementation mode" when handling many sequential tool calls
- Treats trace emission as optional rather than mandatory per-call obligation
- `[pre-read]` gate before Read and `[post-read]` verdict after Read are skipped silently
- `[✓ written]` grep-verify step omitted after Edit/Write calls
- `[loop]` section progress marker not emitted at section boundaries

**Prevention:**
1. Before every Read call: emit `[pre-read] Target: X · Tier: T<N> · Line: <N>` — no exceptions
2. After every Read result is processed: emit `[post-read] File: X · Verdict: relevant|partial|irrelevant`
3. After every Edit/Write: run `grep` to confirm change exists → emit `[✓ written]`
4. At each MECE section boundary: emit `[loop] Section N done · → Section N+1 next`
5. High tool-call volume is NOT an exemption — traces are more important during dense execution

**Detection signal:** User message contains "ไม่เห็นแสดง" or "ไม่ได้ emit" + trace token name ([pre-read]/[post-read]/[loop]/[✓ written]).

---

## CFP-014 · Closing Session with Incomplete/Unchecked MECE Plan or Compilation Errors

**Symptom:** Agent marks a task/session as complete in `session_handoff.md` and the master roadmap, but leaves sections or steps in `.sessions/mece_plan.md` as unchecked (`[ ]`), or leaves syntax/compilation errors in the modified code (such as missing imports of used functions like `eq`).

**Root cause:**
- Rushing to close the session or perform a handoff without verifying that every single section and step in `.sessions/mece_plan.md` has been checked off (`[x]`).
- Omitting project-wide syntax or type checks (e.g. build checks) before declaring a task completed, leading to broken files being checked into the branch.

**Prevention:**
1. Under Loop Phase 3 Completion Gate, always verify that the active thread task has all MECE plan steps marked as `[x]`.
2. Proactively double check all files modified during the session for missing imports or type errors.
3. Never hand off a session with a status of "completed" in `session_handoff.md` if any MECE plan steps or roadmap items for the session are still open or unchecked.

**Detection signal:** User message contains "ทำไมเหมือนมีงานค้าง" or "ยังไม่เสร็จทำไมข้าม" or "mece_plan ยังไม่เสร็จ".


---

## CFP-015 · MECE Plan Written to Chat/Artifact Instead of .sessions/mece_plan.md (Recurrence of CFP-005/CFP-010/CFP-011)

**Symptom:** Agent displays MECE plan in the chat response or in an `implementation_plan.md` artifact but does NOT write it to `.sessions/mece_plan.md`. The session file remains empty or contains a stale previous task's plan.

**Root cause:**
- Agent treated chat output as equivalent to the required session file write
- Skipped the mandatory `write_to_file` call to `.sessions/mece_plan.md` during Phase 2 M2/M3
- Also violated R11 by mixing Thai text into session files (English only rule)
- Also skipped M4 roadmap entry write before proceeding

**Prevention:**
1. Phase 2 M2: always call `write_to_file` to `.sessions/mece_plan.md` — never substitute with chat text
2. Session files must be English only — no Thai task names, descriptions, or step text
3. M4 (roadmap entries) must be written to `docs/master_roadmap.md` BEFORE asking user to confirm
4. Gate check: before starting Phase 3, verify `.sessions/mece_plan.md` exists and contains current task sections

**Detection signal:** User message contains "ไม่เขียนลง mece_plan.md" or "ทำนอกเหนือ harness" or points to `.sessions/mece_plan.md` still showing old content.

---

## CFP-016 · Skipping Per-Turn Routing (C1-C3) Checks and Working Before Boot in Subsequent Turns

**Symptom:** Agent starts editing files, running grep/find commands, or making database schema/routing actions in subsequent turns of a session without executing the Per-Turn Routing protocol (C1-C3, checking `active_thread.md`, and matching topic switches).

**Root cause:**
- The agent assumed that once the session had booted (B1-B3 run in the first turn), subsequent turns within the same user session did not require running the Per-Turn Routing checks (C1-C3) before performing file edits and tool calls.
- Violated the "Per-Turn Routing (every user message)" constraint: "Run C0 -> C1 -> C2 -> C3 before any work. No exceptions."

**Prevention:**
1. In every single turn, before calling ANY tools (like grep, view, edit), always read `.sessions/active_thread.md` using `view_file` to verify the current task topic and check if a topic switch or plan confirmation is needed.
2. The orchestrator must enforce this check immediately as the first tool call of every turn.

**Detection signal:** User message contains "ทำไมทำงานก่อนขั้น [Boot]" or "VBoot ก่อน" or "ลืมเช็ค boot" or "didn't run C1".

---

## CFP-017 · Skipping Boot Sequence, Per-Turn Routing, and Info Gather/MECE Plan Loop on Task Resumption/Topic Switch

**Symptom:** Agent starts writing `implementation_plan.md` or modifying code immediately on task resumption or when a new request is made, without displaying the Boot reply line 1, running C1-C3 per-turn routing, performing Phase 1 gather loop (`[✓ gather]`), or writing a section-based plan to `.sessions/mece_plan.md`.

**Root cause:**
- Attempting to skip to user-facing implementation plans or file edits without establishing thread phase context or executing the mandatory harness steps first.
- Forgetting that every task switch or task resumption requires a new Boot sequence check, per-turn routing check, and the execution of Phase 1 (Info Gather) and Phase 2 (MECE Plan) of the loop architecture.

**Prevention:**
1. At the start of every session/turn, check if the session needs to boot and emit the boot line 1.
2. Execute C1-C3 per-turn routing checking `active_thread.md`.
3. Run Phase 1 gather loop and emit `[✓ gather]`.
4. Run Phase 2 MECE Plan: write the step-by-step plan mapping 1:1 to skill sections in `.sessions/mece_plan.md` and get user confirmation before any code changes.

**Detection signal:** User message complains with "คุณกำลังละเมิดสิ่งที่เรากำหนดไว้ใน harness" or "ทำไมไม่ทำตามกระบวนการ".

---

## CFP-018 · Missing Resume Staleness Gate Check on Task Resumption

**Symptom:** Agent resumes execution on a previously in-progress task but fails to check if workspace code has changed since the last session or if the MECE plan hash matches, leading to working on stale context.

**Root cause:**
- Neglecting the resume staleness gate check described in the Boot Sequence.
- Directly starting work in Phase 3 without checking `git status` or matching plan hash.

**Prevention:**
1. On boot, if `phase == in_progress`, run `git status` to verify if there are any changes to files.
2. Compare the `mece_plan_hash` to ensure it is up to date, and if stale, ask the user to reconfirm the plan.

**Detection signal:** User complains about stale plan or code mismatch on resumption.

---

## CFP-019 · Incorrect MECE Plan Format or Placement

**Symptom:** MECE plan is not written to `.sessions/mece_plan.md` in the exact format defined, or the agent skips writing the plan to `.sessions/mece_plan.md` and only lists it in chat or chat artifacts.

**Root cause:**
- Omitting step-by-step section planning mapped 1:1 to skill sections inside the designated session file.
- Disregarding the requirement to get user confirmation on both the plan steps and DoD (Verify-N criteria) before making changes.

**Prevention:**
1. Always write the MECE plan to `.sessions/mece_plan.md`.
2. Format the plan with structured sections and Verify-N criteria for each section, and await user approval.

**Detection signal:** User or system warns about invalid MECE plan format or placement.
