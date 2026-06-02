# Template: .sessions/mece_plan.md
# Written by: Phase 2 M5 — after user confirms plan + Verify-N
# Read by: Phase Transition Gate (PreToolUse hook) — checks date: == today AND Phase 0 block present
#          C2 routing — checks status: + pending [ ]/[/] sections
#          Boot B1 — resume staleness gate (mece_plan_hash comparison)
#
# ENFORCEMENT RULES (harness_editor Refusal Contract):
#   MUST use this template — no simplified format (CFP-019)
#   MUST include Phase 0-3 blocks — hook validates "## Phase 0" present
#   Phase 0: keep [X] across tasks in same session · reset only on topic switch / new session
#   Phase 1-3: cleared after task complete (PATH A) → "## Phase 1–3 — cleared · status: task-complete"
#   Verify-N: runnable shell commands per section — never prose
#   Constraints: copied from skill's ## MECE Constraints Block (≤5 lines)
#   TOKEN CHECK after every section: >50k → /compact · >60k → TOKEN PAUSE → PATH B
# ---
# MECE Plan — T-XXX <title>
date: YYYY-MM-DD
task: <task description — matches active_thread.md task:>
skill: <skill_name>

## Phase 0 — Boot (once per session · keep [X] on resume · reset on topic switch only)
- [ ] B1: compact_state.md checked · SESSION_TOTAL=0 · CHAT_TOTAL=sys_fixed (dynamic: (CLAUDE.md+AGENTS.md chars × 0.3)+3500 ≈ 11–13k) · CFP_COUNT stored
- [ ] B2-B3: skill=<name> identified · SKILL.md loaded · hashes checked
- [ ] C0-C3: routing confirmed · no unresolved topic switch
→ TOKEN CHECK: SESSION_TOTAL ~___k

---

## Phase 1 — Info Gather
- [ ] G0: task clarity gate (≥3 criteria → skip · else AskUserQuestion)
- [ ] G1: ALL sections scanned in 1 pass
- [ ] G2: batch greps in ONE Bash call · targeted Reads (offset+limit) · [post-read] verdicts emitted
- [ ] G3: every section → file/symbol + Verify-N draft · [✓ gather] emitted
- [ ] gather_complete.md written today (objective · constraints · affected_files · acceptance_criteria)

### Files Read — Phase 1
| File | Why | Lines read |
|---|---|---|
| <path> | <reason> | offset=N limit=N |

→ TOKEN CHECK: `cat .sessions/session_tokens.md`

---

## Phase 2 — Plan
- [ ] M1.5: reasoning pass (sequential vs parallel · irreversible flagged · risk noted)
       dependency_map: [<file_A> → <file_B>, ...]
       risk_flags: [<irreversible action>, <large scope>]
- [ ] M2: plan 1:1 with skill sections · Skill: + Verify-N per section
- [ ] M3: plan + Verify-N sent to user → user confirmed
- [ ] M4: roadmap [ ] T-<N> per section added
- [ ] M5: mece_plan.md written using this template (Phase 0-3 blocks mandatory) · [✓ MECE] emitted

### Files Read — Phase 2
| File | Why | Lines read |
|---|---|---|
| <path> | <reason> | offset=N limit=N |

→ TOKEN CHECK: `cat .sessions/session_tokens.md`

---

## Phase 3 — Execute

### S1 · T-XXX · <Section 1 name>
Skill: <skill_name>
File: <path/to/file>
Tool: <Edit | Write | Bash | Agent>
Rollback: git checkout <path/to/file>
Data_Sent: <what data / old_string / new_string / command is passed to the tool>
Token: ~<NNN> output
Constraints:
  - mece_plan.md dated today + T-N roadmap [/] REQUIRED before any file edit
  - [pre-edit] emit before every Edit · [✓ written] grep verify after every change
  - Output Contracts: [post-read] ≤1 line · [✓ written] ≤1 line · [✓ gather]/[✓ MECE] = signal only
  - L4.5 PURGE: drop Bash/grep results after verdict · keep Read excerpts ≤10L · compress tool result >50L → verdict + path + ≤5 key lines
  - <skill-specific constraint from skill's ## MECE Constraints Block>
Verify-1: <runnable grep/bash command> → <expected output>
- [ ] S1
→ TOKEN CHECK: `cat .sessions/session_tokens.md`  (>50k → /compact · >60k → TOKEN PAUSE → PATH B · spike: turn > 3×avg → emit [spike])

### S<N> · T-XXX · <Section N name>
Skill: <skill_name>
File: <path/to/file>
Tool: <Edit | Write | Bash | Agent>
Rollback: git checkout <path/to/file>
Data_Sent: <what data is passed to the tool>
Token: ~<NNN> output
Constraints:
  - Output Contracts: [post-read] ≤1 line · compress tool result >50L → verdict + path + ≤5 lines
  - L4.5 PURGE: drop Bash/grep after verdict · keep Read ≤10L excerpt only
  - <constraint from MECE Constraints Block>
Verify-N: <command> → <expected>
- [ ] S<N>
→ TOKEN CHECK: `cat .sessions/session_tokens.md`
→ LOOP_WEIGHT CHECK (Behavior Contract):
   Pre:      `grep "^LOOP_WEIGHT:" .sessions/session_tokens.md`
   Contract: >30 → emit [compact-warn] (Skill · Remaining · Resume — all 3 mandatory) BEFORE continuing
             >50 → emit [compact-required] → write compact_state.md → STOP
   Post:     [compact-warn] missing any field = invalid · must re-emit with complete fields
   Enforce:  C0.5 gate in AGENTS.md Per-Turn Routing (fires every turn)

### /compact checkpoint template (M1.5 inserts when: sections ≥ 3 OR sections × 6 > 30)
Sequential notation: `[S1] → [S2] → [/compact] → [S3]`

- [ ] /compact checkpoint
  Pre: compute compact_size:
    `python3 -c "import re,open as o; t=o('.sessions/session_tokens.md').read(); c=int(re.search(r'CHAT_TOTAL:\s*(\d+)',t).group(1)); print(int(c*0.52))"`
  Pre: write compact_state.md (section=S<N> · step=<last-step-desc> · skill=<name> · compact_size=<value>)
  How: user runs `/compact` in terminal
  Post: SESSION_TOTAL=0 · LOOP_WEIGHT=0 · CHAT_TOTAL ≈ compact_size + sys_fixed
  Verify: `cat .sessions/session_tokens.md` → SESSION_TOTAL: 0 · LOOP_WEIGHT: 0
  Resume: open new chat → type: **"Resume T-<N> · Skill: <name> · ต่อจาก S<N+1>"**
          read `.sessions/mece_plan.md` → first `- [ ]` section = next section to execute

---

## Phase 3 — Close Checklist
- [ ] R8 index sync: files/symbols changed → indexes updated (index_files.json · symbol_indexer · session_indexer)
- [ ] Roadmap [X]: all T-<N> sections annotated (attempts + tool_calls)
- [ ] Spawn Reviewer (model_low from detected.md — default: haiku · read-only):
      "Run each Verify-N: line exactly · Report: PASS list · FAIL list"
      On PASS → proceed · On FAIL → fix → retry 1× → R13 [blocked]
- [ ] [mece-audit] emitted: `[mece-audit] Sections: N · All Verify-N: PASS · Plan quality: <note>`
- [ ] Ask user: "มีอะไรอยากแก้ไขหรือปรับเพิ่มไหมครับ?" (1 message — do not loop)
- [ ] Feedback delivered (user replied or timeout after 1 exchange)
- [ ] [session-health] emitted (Completion Gate)
- [ ] **if skill=harness_editor** → Step 5 gate (mandatory before close):
      harness_flow_20260526.md updated (Y-entry) · affected Implement/ files updated · flow_updated=yes
      emit `[harness-edit-done]` → then Thai user summary ("งานเสร็จแล้วครับ ✅ ...")
      ⚡ Do NOT clear mece_plan or write session_handoff until Step 5 complete
- [ ] session_handoff.md written (skill + CFP_COUNT + objective + outcome + changes + validation)
- [ ] self_improve: `grep -c "^## CFP-" CODING_FAILURE_PATTERNS.md` > cfp_boot_count → run §1–3
- [ ] harness_doctor: any recurred_after_fix[] not empty → trigger

---

## Close Path — choose ONE based on state:

### PATH A — Task complete (typical · most common)
```
SESSION: CHAT_TOTAL accumulates (never resets here)
         SESSION_TOTAL written → will reset at NEXT B1 when phase ≠ in_progress
```
- [ ] session_manager §3 (5-file close — all 5 files must be written: session_<NNN>.json, session_tokens.md reset, active_thread.md, session_handoff.md, and index_sessions.json)
- [ ] Clear mece_plan.md → Reset to blank template from docs/session_templates/mece_plan_schema.md (keep date, Phase 0 [X] checks, status: task-complete, and all Phase 1-3 sections blank)

### PATH B — TOKEN PAUSE (SESSION_TOTAL > 60k)
```
SESSION: /compact resets CHAT_TOTAL=0 · B1 at next boot reads compact_size → CHAT_TOTAL = compact_size + sys_fixed
         SESSION_TOTAL=0 written by B1 on compact_restore
```
- [ ] Compute compact_size BEFORE /compact:
      `python3 -c "import re; t=open('.sessions/session_tokens.md').read(); c=int(re.search(r'CHAT_TOTAL:\s*(\d+)',t).group(1)); print(int(c*0.52))"` → compact_size
- [ ] Write compact_state.md:
      dt=<YYYY-MM-DD> s=___k task=<desc> cfp=___
      sk=<skill> sk_h=<8chars> mece_h=<8chars>
      p1=done p2=done p3=<last_section> section=S<N> step=<last step desc>
      resume_at=S<N>:step:<desc>
      compact_size=<value from step above>
- [ ] session_manager TOKEN PAUSE → emit [pre-compact-state] block → ask user confirm
- [ ] claude-code: /compact · other platform: write compact_state.md → STOP

### PATH C — Manual close (user: ปิด / close / จบงาน / done)
```
SESSION: CHAT_TOTAL accumulates (resets ONLY on /compact — not on session close)
         SESSION_TOTAL reset to 0 by session_manager §3
```
- [ ] session_manager §3 (5-file close — all required, no exceptions):
      1. session_<NNN>.json → status: completed + summary_context
      2. session_tokens.md → SESSION_TOTAL: 0
      3. active_thread.md → phase: done + task + next
      4. session_handoff.md → full closeout contract
      5. index_sessions.json → python scripts/session_indexer.py
- [ ] self_improve §1–3 (Step 0 at every session close)
