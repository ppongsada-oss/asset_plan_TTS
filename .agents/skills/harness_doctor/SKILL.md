# Harness Doctor Skill

## Overview
Structural fix agent for CFP patterns that recurred AFTER a fix was already applied.
Reads index_cfp_fix.json + relevant harness files → proposes structural change →
waits approval → executes following harness conventions.

**Triggered by:**
- self_improve §2.5 detects `recurred_after_fix[] not empty`
- User says "harness doctor" / "fix harness pattern" / "recurring cfp" / "ซ่อม harness"
- self_improve §3 escalation after deferred_count ≥ 3

**NOT triggered by:**
- First-time CFP with no fix attempt → use self_improve §3+§4 instead
- CFP with status=active and fixes=[] → not a structural recurrence yet

**Sections:**
1. Diagnosis — identify target CFP + prior fix history + current model
2. Harness Audit — grep harness files to locate the structural gap
3. Proposal — draft structural fix · dry-run validate · HALT for approval
4. Approval Gate — wait explicit user confirm · no auto-proceed
5. Execute + Verify — apply fix · update index · confirm detection signal

---

## Section 1 — Diagnosis

```
Step 1: Load index — find top recurred CFP
  python3 -c "
import json, os, sys
if not os.path.exists('knowledge/index_cfp_fix.json'):
    print('NO_INDEX'); sys.exit(0)
idx = json.load(open('knowledge/index_cfp_fix.json'))
candidates = {k: v for k, v in idx.items()
              if isinstance(v, dict) and v.get('recurrence_after_fix', 0) > 0}
if not candidates:
    print('NO_RECURRED')
else:
    top = max(candidates, key=lambda k: candidates[k]['recurrence_after_fix'])
    e = candidates[top]
    print('target:', top)
    print('group:', e['group'])
    print('recurrence_after_fix:', e['recurrence_after_fix'])
    print('status:', e['status'])
    for i, f in enumerate(e.get('fixes', [])):
        print(f'fix[{i}]:', f.get('description',''), '→', f.get('status','pending'))
  "
  → NO_RECURRED → emit [harness-doctor-skip] No recurring CFPs with prior fix · end skill
  → found → store: target_cfp · target_group · prior_fix_descriptions[]

Step 2: Read CFP entry from CODING_FAILURE_PATTERNS.md
  [pre-read] Target: target_cfp entry
  grep -n "^## target_cfp" CODING_FAILURE_PATTERNS.md → line L
  Read CODING_FAILURE_PATTERNS.md offset=L limit=30
  [post-read] verdict: relevant | partial | irrelevant
  → extract: Symptom · Root cause · Prevention · Detection signal

Step 3: Record diagnosing model
  → check environment / session context for current model_id
  → default: "claude-sonnet-4-6" (update if running on different model)
  → store as diagnosing_model in working memory

Step 4: Emit [diagnosis]
  [diagnosis] target_cfp "<title>"
  · Group: target_group
  · Fixes tried: N · Still recurring after fix
  · Model diagnosing: diagnosing_model
  · Symptom: <from CFP entry>
  · Prior fix attempts: <descriptions from fixes[]}
  · Recurrence hypothesis: <why fix didn't hold — narrow signal / no hook / agent drift>
```

---

## Section 2 — Harness Audit

Goal: locate WHERE the structural gap is that lets the pattern slip through again.

**Group → Audit target mapping:**

| Group | Primary audit targets |
|---|---|
| `skip_planning` | CLAUDE.md R13 · AGENTS.md §Loop Architecture · PreToolUse hook for gather/mece gate |
| `boot_gap` | CLAUDE.md §Boot · AGENTS.md §Boot Sequence · PreToolUse hook |
| `skip_verification` | AGENTS.md §Phase 3 L4 · CLAUDE.md R12 |
| `rule_drift` | CLAUDE.md §R<N> matching violation · AGENTS.md §Quick Reference |
| `premature_report` | AGENTS.md §Completion Gate |
| `index_desync` | CLAUDE.md R8 · AGENTS.md §Backlink Rule |
| `db_safety` | CLAUDE.md R15 · INVARIANTS.md §I2 |
| `token_management` | CLAUDE.md R3 · AGENTS.md §TOKEN PAUSE |

```
Step 1: Grep audit targets for target_group
  grep -n "<detection_signal_keywords>" CLAUDE.md | head -10
  grep -n "<detection_signal_keywords>" AGENTS.md | head -10
  (run both in one Bash call)

Step 2: Check hooks in settings.json
  grep -n "PreToolUse\|PostToolUse\|Stop" .claude/settings.json 2>/dev/null | head -15

Step 3: Classify the gap — exactly ONE of:
  (a) Rule exists · detection signal too narrow → widen keywords/condition
  (b) Rule exists · no hook enforces it → propose hook addition
  (c) Rule exists · agent ignores it → strengthen with emit gate + HALT
  (d) Rule missing entirely → draft new R-N or §section

Step 4: Emit [audit-finding]
  [audit-finding] Gap type: <a|b|c|d>
  · Location: <file> §<section> line <N>
  · Why prior fix failed: <specific reason — not vague>
  · Evidence: <grep output line that shows the gap>
```

---

## Section 3 — Proposal

```
Step 1: Draft structural fix based on gap type
  (a) Widen: expand detection_signal keywords in existing rule · edit that line only
  (b) Hook: propose new PreToolUse/Stop entry in .claude/settings.json
  (c) Gate: rewrite rule step as emit + HALT condition
  (d) New rule: draft R-N text following existing rule format

Step 2: Dry-run validation
  Does proposed change catch the original symptom?
    Simulate: if detection_signal_new matches symptom → YES
  Does it conflict with INVARIANTS.md?
    grep -iE "<2-3 key terms from proposal>" INVARIANTS.md | head -3
  Both OK → proceed to Step 3
  Conflict or dry-run fail → revise → max 2 revisions
    Still failing after 2 → emit [proposal-mismatch] · explain gap · ask user to redirect

Step 3: Present proposal — HALT · do NOT execute yet
  [harness-proposal] target_cfp "<title>"
  Model: diagnosing_model
  Gap type: <a|b|c|d>
  Location: <file> §<section> line <N>
  Change:
    BEFORE: <current text (≤3 lines)>
    AFTER:  <proposed text (≤5 lines)>
  Why this works: <how it prevents recurrence structurally>
  Why prior fix failed: <specific — not generic>
  → พิมพ์ "ทำเลย" เพื่อ execute หรือ "skip" เพื่อข้ามได้ครับ
```

---

## Section 4 — Approval Gate

```
HALT — read no files, edit no files until explicit user confirm arrives in chat.

Accepted: "ทำเลย" / "proceed" / "yes" / "ได้เลย" / "confirm" → Section 5
Rejected: "skip" / "ไว้ก่อน" / "no" →
  emit [harness-proposal-deferred] target_cfp
  write to session_handoff.md: cfp_deferred: { "target_cfp": deferred_count + 1 }
  end skill
```

---

## Section 5 — Execute + Verify

```
Step 1: Apply approved change
  [pre-edit] Symbol/Rule: <name> · used_in: <files> · safe to edit: yes
  Edit target file at identified location
  [post-read] verdict after edit: relevant (confirm change is present)
  Conventions:
    New rule → insert at R-N slot maintaining numerical order
    New hook → valid JSON, test with: python3 -c "import json; json.load(open('.claude/settings.json'))" → no error
    Widen detection → edit detection_signal line only, do not touch other CFP fields

Step 2: Update index_cfp_fix.json — record new fix attempt
  python3 -c "
import json
from datetime import date
idx = json.load(open('knowledge/index_cfp_fix.json'))
entry = idx.get('target_cfp', {})
entry.setdefault('fixes', []).append({
    'applied_date': str(date.today()),
    'by_model': 'diagnosing_model',
    'description': 'structural_change_summary',
    'status': 'pending'
})
entry['status'] = 'resolved-pending'
idx['target_cfp'] = entry
json.dump(idx, open('knowledge/index_cfp_fix.json', 'w'), indent=2)
print('fix recorded: pending')
  "

Step 3: Verify detection signal now works
  Re-run the Detection signal from the CFP entry
  → confirm it matches the new keyword / emit / gate
  PASS → [✓ detection-signal] Works
  FAIL → attempt one more refinement → still fail → [blocked] and report

Step 4: Update CODING_FAILURE_PATTERNS.md Fix Attempts section
  grep -n "^## target_cfp\|^### Fix Attempts" CODING_FAILURE_PATTERNS.md → find position
  Append under ### Fix Attempts:
    - [TODAY] [diagnosing_model] <structural_change_summary> → status: pending

Step 5: Completion
  [✓ harness-fix] target_cfp · Gap: <type> · File: <edited> · Detection: verified
  Fix status in index_cfp_fix.json: resolved-pending
  (session_manager §3 Step 0.6 will auto-update to "recurred" or "resolved" on next close)

---

## MECE Constraints Block (copy into mece_plan.md for sections using `harness_doctor`)
```
- Sections 1-2 (Diagnosis + Audit): read-only — no src/ or harness edits
- Section 3 (Proposal): emit [harness-proposal] then HALT · do NOT execute yet
- Section 4 (Approval Gate): wait explicit user confirm · no auto-proceed
- Section 5 (Execute): apply only the approved proposal — no scope creep
- [✓ harness-fix] trace required at completion · update index_cfp_fix.json status
```
```
