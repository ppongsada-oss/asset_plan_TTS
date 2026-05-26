# Self-Improvement Skill

## Overview
Analyzes CFP history → identifies recurring failure patterns → proposes and executes concrete harness improvements.

**Triggered by:**
- Automatic: session_manager §3 Step 0 calls this at every session close
- Manual: user says "review CFP" / "improve harness" / "ดู pattern" / "พัฒนา harness" / "ปัญหาซ้ำ"
- Condition: full analysis only if ≥1 new CFP logged this session OR user explicitly requests

**Sections:**
1. CFP Tally — count new entries this session
2. Pattern Analysis — rank by frequency, find root cause
3. Proposal — one concrete harness change to prevent top pattern
4. Execution — apply approved change to harness files

---

## Section 1 — CFP Tally

```
Step 1: grep -c "^## CFP-" CODING_FAILURE_PATTERNS.md   → current_count
Step 2: Compare with cfp_boot_count from working memory (recorded at Boot B1)
         cfp_boot_count missing? (e.g., after /compact cleared memory):
           → grep cfp_boot_count from .sessions/session_handoff.md
           → still missing → use 0 + emit [cfp-tally] note: "baseline approximate (memory reset)"
         new_cfps = current_count - cfp_boot_count
Step 3: Decision:
         new_cfps = 0 AND user did not explicitly request review
           → emit [cfp-skip] No new CFPs this session
           → STOP — do not continue to Section 2
         new_cfps ≥ 1 OR user asked
           → emit [cfp-tally] New: <N> · Total: <current_count>
           → continue to Section 2
```

**Note:** At Boot B1, record current CFP count into working memory as `cfp_boot_count`.
This is a lightweight grep — do not read the full file.

**CFP Archive Gate (run at end of Section 1 when current_count > 20):**
```
1. grep "^## CFP-" CODING_FAILURE_PATTERNS.md → get all headers
2. keep_count = 15  ← always keep most recent 15 entries
3. archive_count = current_count - keep_count
4. Extract oldest archive_count entries (CFP-1 through CFP-<archive_count>)
5. Append to knowledge/cfp_archive.md (create if missing)
6. Remove archived entries from CODING_FAILURE_PATTERNS.md
7. Emit [cfp-archive] Archived: CFP-1–CFP-<N> → knowledge/cfp_archive.md · Active: <keep_count>
```
- Archive is append-only — never delete from cfp_archive.md
- grep overhead on CODING_FAILURE_PATTERNS.md stays bounded at ≤15 active entries

---

## Section 2 — Pattern Analysis

```
Step 1: grep "^## CFP-" CODING_FAILURE_PATTERNS.md
         → list all entry headers → extract titles
Step 2: grep -cE "recurrence of CFP-[0-9]+" CODING_FAILURE_PATTERNS.md per CFP-N
         (use [0-9]+ not [0-9] — supports CFP-10, CFP-11, … without truncation)
         → build frequency table: CFP-N → recurrence count
Step 3: Identify top pattern using PRIORITY QUEUE (NH2 + V13 fix ◆):
  Priority 1 — CURRENT SESSION: CFP-N where N > cfp_boot_count
    These happened THIS session → always address first, regardless of recurrence count
    Multiple P1 entries → pick lowest N (earliest this session)
  Priority 2 — HISTORICAL: CFP-N where N ≤ cfp_boot_count, ranked by recurrence count
    Only evaluated if Priority 1 is empty
    Tie → most recent (highest CFP number)
  Emit [cfp-analysis] showing BOTH layers so user sees the full picture
Step 4: [pre-read] top pattern entry
         grep -n "^## CFP-<N>" CODING_FAILURE_PATTERNS.md → line L
         Read CODING_FAILURE_PATTERNS.md offset=L limit=30
Step 4.5: Session context lookup for top pattern (optional — run if CFP entry has Session: field)
         grep "Session:" from CFP entry → extract session_id
         Read .sessions/<session_id>.json → check History[] for what triggered the violation
         → adds concrete context: "This happened during <task> when agent <action>"
         → if session file missing or no Session: field → skip, use CFP text only
Step 5: Emit:
  [cfp-analysis]
  · New this session: <N> entries (CFP-<list>)
  · Top pattern: CFP-<N> "<title>" — seen <K> time(s)
  · Root cause: <one-line summary from Prevention section>
  · Session context: <what task + action triggered it> (if found in Step 4.5)
  · Other patterns: <list remaining titles briefly>
```

---

## Section 3 — Proposal

```
Step 1: Based on top pattern root cause from Section 2:
         → Which rule/step in CLAUDE.md or AGENTS.md would prevent this?
         → Is there a missing check, missing emit, missing routing case, or missing gate?
         → Map to specific section: "Add to CLAUDE.md §R<N> step <X>" or
                                   "Add to AGENTS.md §C<N>" or
                                   "Add to <SKILL.md> §Section <N>"

Step 2: Propose ONE concrete, minimal change (do not redesign entire rules)

Step 2.5: Dry-run validation (V21 fix ◆)
  Would the proposed change have caught the original violation?
  Test: does the proposed rule's condition match the complaint keywords / missed step?
  YES → proceed to Step 3
  NO → revise proposal → re-test → max 2 revisions
    Still NO after 2 revisions → emit [proposal-mismatch]
    Explain gap: "เสนอนี้จะป้องกัน <Y> แต่ไม่ตรงกับ <original complaint X>"
    Ask user: "ต้องการ proceed ต่อ หรือ skip?"
         Bad: "rewrite R9"
         Good: "เพิ่ม guard ใน R9 step 1: ถ้า grep ไม่เจอ ERR-XXX → emit [warn-no-err-code] ก่อน proceed"

Step 3: Present to user — format:
  🔍 CFP Pattern พบบ่อย: CFP-<N> "<title>" (<K> ครั้ง)
  ปัญหา: <root cause in Thai>
  เสนอแก้: <specific change> ใน <file> §<section>
  ผลที่คาดหวัง: agent จะ <new behavior> แทนที่จะ <old behavior>
  → ยืนยันเพื่อดำเนินการ หรือ พิมพ์ "skip" เพื่อข้ามได้ครับ

Step 4: WAIT for explicit confirm before Section 4
         "ทำเลย" / "proceed" / "yes" / "ได้เลย" → go to Section 4
         "skip" / "later" / "ไว้ก่อน" → emit [cfp-deferred] · end skill
         silence (user's next message does not reference this proposal) ◆:
           → write pending_proposal: "CFP-<N>" to session_handoff.md
           → do NOT defer immediately — re-present at START of NEXT session
           → emit [cfp-pending] instead of [cfp-deferred]
         On defer: write to session_handoff.md:
           cfp_deferred: { "CFP-<N>": <deferred_count + 1> }

Escalation rule (V16):
  deferred_count ≥ 3 for same CFP-N → upgrade proposal tone:
    "⚠️ CFP-<N> '<title>' เกิดซ้ำแล้ว <K> ครั้ง ถูก defer แล้ว <D> ครั้ง
     ถ้าไม่แก้จะส่งผลให้: <what breaks>
     → ยืนยันแก้ หรือ พิมพ์ 'dismiss' เพื่อปิดถาวร (จะไม่เสนออีก)"
  "dismiss" → write cfp_dismissed: ["CFP-N"] to session_handoff.md → skip in future sessions
```

---

## Section 4 — Execution

```
Step 0: Cooldown gate (V24 fix ◆)
  Read session_handoff.md → last_self_improve_session: N
  If last_self_improve_session was ≤ 2 sessions ago AND user did NOT explicitly request:
    → emit [cfp-cooldown] Skip — §4 ran recently (session <N>)
    → end skill (no change made)
  Exception: recurrence ≥ 5 OR user typed "improve harness" / "พัฒนา harness" → bypass cooldown

Step 0.5: INVARIANTS.md conflict check (V23 fix ◆)
  Extract 2–3 key terms from the proposed change
  grep -iE "<terms>" INVARIANTS.md | head -5
  Conflict found (e.g., rule would bypass a gate) → halt:
    emit [blocked-invariant] "เสนอนี้ขัดกับ I<N>: <quote>"
    Ask user: "ยืนยัน override หรือ revise proposal?"
  No conflict → proceed

Step 0.6: Backup target file (NS1 fix ◆)
  Bash: cp <target_file> <target_file>.bak_$(date +%Y%m%d_%H%M)
  On verify failure at Step 2: git checkout -- <target_file> (or restore from .bak)
  On verify success: rm <target_file>.bak_* (clean up)

Step 1: Apply approved change
         Edit target file (CLAUDE.md / AGENTS.md / SKILL.md)
         Follow R5 pre-edit gate before every Edit call

Step 2: Verify write succeeded
         grep for newly added text → emit [✓ harness-updated]
         Not found → retry once → still missing → emit [blocked] and halt

Step 3: If change affects skill routing keywords
         Update skill-manifest.json keywords[] for affected skill

Step 4: Confirm to user:
  ✅ Harness อัปเดตแล้วครับ
  · ไฟล์: <path> §<section>
  · เพิ่ม: <what was added>
  · CFP-<N> prevention: agent จะ <new check> ทุกครั้งที่ <trigger condition>

Step 5: Update harness_flow_20260525.md Patch table (V18)
  Append new row to the most recent patch table (Q# series):
  | Q<N> | <gap described in CFP-<N>> | <fix applied in §4> | <files changed> |
  Where Q<N>: grep -c "^| Q" knowledge/harness_flow_20260525.md → N+1
  Verify row written: grep "Q<N>" knowledge/harness_flow_20260525.md → found

Step 6: Write self_improve_log.md audit entry (NS2 fix ◆)
  Bash: ls .sessions/self_improve_log.md 2>/dev/null || printf "# Self-Improve Audit Log\n\n" > .sessions/self_improve_log.md
  Append to .sessions/self_improve_log.md:
  ## SI-<N> · <YYYY-MM-DD> · <session_id>
  - CFP: CFP-<N> "<title>"
  - File: <path changed>
  - Change: <what was added (one line)>
  - Trigger: complaint | session-close-review | user-request
  ---
  Where N = grep -c "^## SI-" .sessions/self_improve_log.md → N+1
  Verify: grep "SI-<N>" .sessions/self_improve_log.md → found
  Update session_handoff.md: last_self_improve_session: <current session_id>
```

---

## §4 Invariants

- MUST NOT edit `self_improve/SKILL.md` directly (V20 — circular dependency)
  If proposal targets this file: emit [blocked-self-edit]
  Present the proposed change as a code block to user
  Ask user to apply it manually → confirm when done
- MUST NOT edit `INVARIANTS.md` gates without separate R14 [gate] confirmation
- MUST NOT remove or reorder existing rules — only append or extend
```

---

## Boot Integration

At Boot B1, the boot command must capture current CFP count:
```bash
cfp_boot_count=$(grep -c "^## CFP-" CODING_FAILURE_PATTERNS.md 2>/dev/null || echo 0)
```
Store in working memory — used in Section 1 Step 2 comparison.

---

## CFP Logging Format (used by R16 C0 complaint handler)

When logging a new CFP entry inline during task execution:

```
Step 1: grep -c "^## CFP-" CODING_FAILURE_PATTERNS.md → count N → next = CFP-(N+1)
Step 2: Append to CODING_FAILURE_PATTERNS.md:

## CFP-<N+1> · <Short Title of What Was Skipped>

**Symptom:** <What the user observed — what was missing>

**Root cause:**
- <Why agent skipped this step>
- <Which rule/phase was violated>

**Prevention:**
1. <Specific check to add to prevent recurrence>
2. <Where in the loop this check should live>

**Detection signal:** User message contains `<keyword matching C0 signal list>` + missing step name

---

Step 2.5: Validate "Detection signal:" field — must contain ≥1 keyword from:
  ["ทำไมไม่ทำตาม", "ไม่ได้ทำตาม", "ลืม"+"step", "ไม่ได้บันทึก", "ไม่ได้ log",
   "you skipped", "you forgot", "harness says", "CLAUDE.md says", "rule says"]
  Keyword absent/vague → rewrite before proceeding.
Step 3: Verify: grep -c "^## CFP-" CODING_FAILURE_PATTERNS.md → N+1
```

Hard rules: never skip · never re-use CFP number · same pattern recurs → new CFP with `(recurrence of CFP-N)` · non-blocking.

---

## Invariants

- Never propose changes that contradict INVARIANTS.md
- Never delete existing CFP entries — only add
- Proposals must be minimal and specific — one rule change per session
- If user rejects proposal: log `[cfp-deferred CFP-N]` in session_handoff.md
  so next session can re-propose if pattern recurs
