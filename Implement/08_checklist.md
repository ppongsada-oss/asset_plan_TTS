# Implement/08_checklist.md — Post-Installation Verification Checklist

> Run this checklist after completing Track A or Track B setup.
> For each item: run the Verify command → if it fails → follow the Fix action.
> All commands run from `[PROJECT_ROOT]` (the directory containing CLAUDE.md).

**Total required files: 26**
(11 skill files + 3 config + 2 routing + 1 platform + 4 knowledge + 3 scripts + 1 docs + 1 failure patterns)

> Note: `02_setup.md §9` has a flat checkbox list. This file adds per-section grep verification and fix actions that §9 does not cover.

---

## 1. Config Files (3 required)

### 1.1 `CLAUDE.md`

Required sections (quick count):
```bash
grep -c "## Boot\|## R1\|## R2\|## R3\|## R4\|## R5\|Loop Architecture\|Cycle Gate\|platform-unknown\|Completion Gate" CLAUDE.md
```
Expected: ≥ 10 matches

| Section | Verify command | Expected |
|---|---|---|
| Boot B1–B4 | `grep -c "\[B[1-4]\]" CLAUDE.md` | 4 |
| CFP_COUNT in Boot | `grep -c "cfp_boot_count\|CFP_COUNT" CLAUDE.md` | ≥ 2 |
| Per-Turn C0-C3 | `grep -c "C0\|C1\|C2\|C3\|topic.switch\|complaint" CLAUDE.md` | ≥ 4 |
| R16 Self-Improvement | `grep -c "R16\|self.improve\|cfp_boot_count" CLAUDE.md` | ≥ 3 |
| R4 spawn patterns | `grep -c "Explore\|Execution\|Parallel fan-out" CLAUDE.md` | 3 |
| R4 platform-agnostic | `grep -c "spawn_tool\|detected.md\|platform-unknown" CLAUDE.md` | ≥ 3 |
| Cycle Gate | `grep -c "Cycle Gate\|cycle_N_\|TOKEN MERGE" CLAUDE.md` | ≥ 2 |
| Completion Gate | `grep -c "Completion Gate" CLAUDE.md` | ≥ 1 |
| R5 Post-Read Gate | `grep -c "post-read\|Post-Read Verdict" CLAUDE.md` | ≥ 1 |
| R5 T0 Oracle | `grep -c "lookup.py\|T0\|Tier 0\|pre-read oracle" CLAUDE.md` | ≥ 2 |
| R8 Session Index Sync | `grep -c "session_indexer\|index_sessions" CLAUDE.md` | ≥ 1 |

- [ ] Boot reply line 1 includes `CFP: <cfp_boot_count>` field
- [ ] `[post-read]` verdict emitted after every Read call (relevant | partial | irrelevant)
- [ ] Per-Turn C0 complaint check active with c0_resolved flag (prevents infinite loop)
- [ ] Per-Turn C2 topic-switch detection has IS/NOT/UNCERTAIN criteria
- [ ] Phase 1 gather uses **hybrid front-loaded model**: G1 scans all sections at once → G2 runs all greps in one Bash call → single user ask (max 1) if still missing → emit `[✓ gather]`
- [ ] `attempt_count` + `mece_plan_hash` written to session_handoff.md before any session pause
- [ ] MECE Staleness Gate active on resume: sha1 check + git status src/
- [ ] Verify command is checkable (not self-assessed): non-empty ≠ pass
- [ ] MECE plan sections each have mandatory `Skill:` field
- [ ] `mece/SKILL.md` has Verify Pattern Lookup table (≥ 10 rows)
- [ ] `mece/SKILL.md` has Multi-skill Complex Feature template
- [ ] `mece/SKILL.md` has Token Check block before `[cycle N]` emit
- [ ] `mece/SKILL.md` has Feedback & Error Summary as Final Step before `[MECE]` done emit
- [ ] **B2 conditional skip**: prompt contains `skill: <name>` → manifest grep skipped (saves ~1,300 tokens)
- [ ] **B3 sections-only load**: SKILL.md read with `offset=1 limit=80` — `on_demand_files` NOT auto-loaded at boot
- [ ] **Never-Full-Load list** in CLAUDE.md §R5: 7 files listed (CLAUDE.md, index_files.json, index_variables.json, master_roadmap.md, CODING_FAILURE_PATTERNS.md, INVARIANTS.md, error_index.md) with `[violation] never-full-load` emit on breach
- [ ] **Full-Read whitelist** present: only SKILL.md (B3 ≤80L), src/ ≤80 lines (Phase 1 G2 only), REPO_MAP.md, session files
- [ ] Verify with: `grep -c "Never-Full-Load\|Full-Read whitelist" CLAUDE.md` → ≥ 2
- [ ] **L4.5 PURGE step**: drops raw tool results after Cycle N aggregation · keeps only verdict + artifact path
- [ ] **Delegation Contract ≤800 tokens**: `constraints:` = rule numbers only · `cycle_context:` = ≤5 bullets ≤150 chars
- [ ] **MECE plan size caps**: ≤5 steps/section · ≤2 verify commands/section (≤60 chars each) · total ≤120 lines
- [ ] **self_improve CFP archive gate**: triggers when CFP count > 20 → archives oldest entries → keeps 15 active
- [ ] **MANDATORY BOOT GATE** section present: agent must emit `[Boot]` before responding — skipping = CFP violation
- [ ] **PHASE TRANSITION GATE** section present: `[✓ gather]` + `[✓ MECE]` required before any `src/` edit
- [ ] Gate text explicitly states: "Reading SKILL.md at B3 is NOT Phase 1"
- [ ] **R9 Step 0 — Recurring Fix Detection** present: signals list ("ยังไม่หาย", "still broken", "same error", etc.) triggers grep of `### Failed Approaches:` before choosing next fix
- [ ] **`### Failed Approaches:` field** in R9: agent MUST write this field on R12 verify failure before escalating per R13
- [ ] **`[✓ gather]` writes `gather_complete.md`**: G3 emit step includes writing `.sessions/gather_complete.md` with `date: YYYY-MM-DD`
- [ ] **Sub-agent `constraints:` block**: execution/coder agents MUST include `constraints:` block in prompt (roadmap check, gather/mece files, index sync, db-gate)
- [ ] **R5 T0 Oracle**: `python scripts/lookup.py "<symbol>" --json` runs BEFORE any grep or Read (Tier 0 in lookup hierarchy)
- [ ] **T0 emit format**: `[pre-read]` trace includes `Tier: T0` when lookup.py is called
- [ ] **R8 session_indexer**: `python scripts/session_indexer.py` listed in R8 Index Sync table for session close event

### 1.1a `settings.json` hooks (enforcement layer)

| Hook | Verify | Expected behavior |
|---|---|---|
| `UserPromptSubmit` | `jq '.hooks.UserPromptSubmit' ~/.claude/settings.json` | Injects boot reminder via `additionalContext` |
| `SessionStart` | `jq '.hooks.SessionStart' ~/.claude/settings.json` | Injects 5-step flow at session start |
| `PreToolUse` (Edit\|Write) | `jq '.hooks.PreToolUse' ~/.claude/settings.json` | Blocks `src/` edit if `gather_complete.md` OR `mece_plan.md` missing/stale (date check) |

```bash
# Verify all three hooks present
jq '.hooks | keys' ~/.claude/settings.json
# Expected: ["PreToolUse", "SessionStart", "UserPromptSubmit"]

# Verify session-scoped date check in PreToolUse hook
jq -r '.hooks.PreToolUse[0].hooks[0].command' ~/.claude/settings.json | grep -c "date -r"
# Expected: 2 (checks both gather_complete.md and mece_plan.md)
```

Fix if missing: add to `~/.claude/settings.json` per `Implement/03_config.md` hook section.

Fix if missing: `Implement/03_config.md` → CLAUDE.md template → copy missing section.

---

### 1.2 `AGENTS.md`

| Section | Verify command | Expected |
|---|---|---|
| Boot B1–B4 | `grep -c "\[B[1-4]\]" AGENTS.md` | 4 |
| Per-Turn C0-C3 | `grep -c "C0\|C1\|C2\|C3\|topic.switch" AGENTS.md` | ≥ 4 |
| Loop Architecture | `grep -c "Loop Architecture\|Phase" AGENTS.md` | ≥ 3 |
| Quick Reference table | `grep -c "Token footer\|File reads\|Symbol edits" AGENTS.md` | ≥ 3 |
| Sub-agent Rules | `grep -c "Sub-agent Rules\|spawn_tool\|Cycle" AGENTS.md` | ≥ 3 |
| Critical Rules | `grep -c "Critical\|Edge Runtime\|PapaParse\|D1" AGENTS.md` | ≥ 2 |

Fix if missing: `Implement/03_config.md` → AGENTS.md template.

---

### 1.3 `INVARIANTS.md`

| Gate | Verify command | Expected |
|---|---|---|
| I1 Destructive | `grep -c "I1\|destructive\|\[gate\]" INVARIANTS.md` | ≥ 2 |
| I2 DB hard stop | `grep -c "I2\|db-gate\|HALT" INVARIANTS.md` | ≥ 2 |
| I3 Index sync | `grep -c "I3\|index.*sync\|symbol_indexer" INVARIANTS.md` | ≥ 2 |
| I4 Symbol check | `grep -c "I4\|symbol.*check\|used_in" INVARIANTS.md` | ≥ 2 |
| I5 Roadmap gate | `grep -c "I5\|roadmap.*gate\|\[X\]" INVARIANTS.md` | ≥ 2 |
| I6 Pre-assign IDs | `grep -c "I6\|pre.assign\|race condition" INVARIANTS.md` | ≥ 2 |
| I7 Token accounting | `grep -c "I7\|tokens_estimated\|TOKEN MERGE" INVARIANTS.md` | ≥ 2 |
| I8 CFP ID pre-assign | `grep -c "I8\|CFP ID\|cfp.*pre" INVARIANTS.md` | ≥ 2 |

Fix if missing: `Implement/03_config.md` → INVARIANTS.md template.

---

## 2. Skill Files (10 required)

All skill files must have: frontmatter (`name` + `description`) · `Sections[]` YAML · main content · Context Gate.

Run this to check all 11 exist:
```bash
ls .agents/skills/agent/SKILL.md .agents/skills/coder/SKILL.md .agents/skills/editor/SKILL.md \
   .agents/skills/file_manager/SKILL.md .agents/skills/identity/SKILL.md .agents/skills/mece/SKILL.md \
   .agents/skills/self_improve/SKILL.md .agents/skills/session_manager/SKILL.md \
   .agents/skills/token_auditor/SKILL.md .agents/skills/token_tracker/SKILL.md \
   .agents/skills/variable_manager/SKILL.md 2>&1
```
Expected: 11 paths printed, zero "No such file" errors.

Run this to check all 11 have a Context Gate:
```bash
grep -l "Context Gate" .agents/skills/*/SKILL.md | wc -l
```
Expected: 11

### Per-skill section requirements

| Skill | Required terms (grep pattern) | Min matches |
|---|---|---|
| `agent` | `Orchestration Protocol\|Delegation Contract\|on_demand_files\|PURGE\|tokens_estimated` | 5 |
| `coder` | `Roadmap Protocol\|Coding Standards\|Sections\|Responsibilities` | 4 |
| `editor` | `Roadmap Protocol\|3-Tier\|Edit\|Sections\|Responsibilities` | 5 |
| `file_manager` | `Backlink\|Triggers\|Pre-Analysis\|Sections` | 4 |
| `identity` | `Fatal Constraint\|session_compactor\|git.*commit\|push` | 3 |
| `mece` | `Plan Format\|Skill:.*MANDATORY\|Verify Pattern\|Feedback.*Error Summary` | 4 |
| `self_improve` | `cfp_boot_count\|cfp-tally\|cfp-skip\|proposal-mismatch\|blocked-self-edit` | 5 |
| `session_manager` | `BLOCKED\|Resume Flow\|mece_plan_hash\|cfp_deferred\|self_improve` | 5 |
| `token_auditor` | `Self-Heal\|inject\|offending\|Audit` | 3 |
| `token_tracker` | `SESSION_TOTAL\|TOKEN PAUSE\|tiered\|150 lines\|300 lines` | 4 |
| `variable_manager` | `Triggers\|Pre-Analysis\|symbol_indexer\|Sections` | 4 |

Verify a specific skill (swap in any skill name):
```bash
grep -c "Orchestration Protocol\|Delegation Contract\|cycle_context\|detected.md" .agents/skills/agent/SKILL.md
```

Fix if any skill is missing or incomplete: `Implement/04_skills.md` → find that skill's section → copy full content to `.agents/skills/<skill>/SKILL.md`.

---

## 3. Routing Files (2 required)

### 3.1 `.agents/skills/registry.md`

```bash
grep -c "agent\|coder\|editor\|file_manager\|identity\|mece\|session_manager\|token_auditor\|token_tracker\|variable_manager" .agents/skills/registry.md
```
Expected: ≥ 10 (at least one match per skill)

### 3.2 `.agents/skills/skill-manifest.json`

Validate JSON and count skill entries:
```bash
python3 -c "
import json
d = json.load(open('.agents/skills/skill-manifest.json'))
skills = d.get('skills', d) if isinstance(d, dict) else d
print('Skill entries:', len(skills) if isinstance(skills, list) else 'check structure')
"
```
Expected: 11

Count keyword arrays:
```bash
grep -c '"keywords"' .agents/skills/skill-manifest.json
```
Expected: 11

Check manifest version and on_demand_files (v2.1 requirement):
```bash
grep -c '"version": "2.1"' .agents/skills/skill-manifest.json && \
grep -c '"on_demand_files"' .agents/skills/skill-manifest.json
```
Expected: 1 (version 2.1 present) · ≥ 6 (`on_demand_files` arrays present across skills)

Check `lookup_oracle` blocks present for editor, coder, and session_manager skills:
```bash
grep -c '"lookup_oracle"' .agents/skills/skill-manifest.json
```
Expected: ≥ 3 (editor · coder · session_manager)

Check `never_at_boot` list includes index_sessions.json:
```bash
grep -c "index_sessions" .agents/skills/skill-manifest.json
```
Expected: ≥ 1

Fix if missing or incomplete: `Implement/03_config.md` → skill-manifest.json template → add the missing skill entry or upgrade to v2.1 format.

---

## 4. Platform Adapter (1 required)

### 4.1 `.agents/platform/detected.md`

```bash
cat .agents/platform/detected.md
```
Check that `platform:` field is NOT `unknown`.

If `platform: unknown` → the Platform Probe (Boot B4) has not yet run. Run it now:
```bash
# Option A — trigger automatically by starting a new agent session (Boot B4 fires on unknown)
# Option B — answer Q1–Q4 in the [platform-unknown] co-development dialogue (see 07_platform.md)
# Option C — set manually if platform is already known:
sed -i 's/platform: unknown/platform: antigravity/' .agents/platform/detected.md
sed -i 's/spawn_tool: unknown/spawn_tool: invoke_subagent/' .agents/platform/detected.md
```

See `Implement/07_platform.md` for all known platform mappings.

---

## 5. Knowledge Files (3 required)

### 5.1 `knowledge/index_files.json`

```bash
python3 -c "import json; d=json.load(open('knowledge/index_files.json')); print('Files indexed:', len(d))"
```
Expected: ≥ 1 after first indexing run (0 is acceptable on a brand-new project before any files exist).

### 5.2 `knowledge/index_variables.json`

```bash
python3 -c "import json; d=json.load(open('knowledge/index_variables.json')); print('Symbols indexed:', len(d))"
```
Expected: ≥ 1 after first `symbol_indexer.py` run.

### 5.3 `knowledge/index_sessions.json`

```bash
python3 -c "import json; d=json.load(open('knowledge/index_sessions.json')); print('Sessions indexed:', len(d.get('sessions', d)))"
```
Expected: ≥ 1 session entry after first `session_indexer.py` run.

Verify structure includes required fields:
```bash
python3 -c "
import json; d=json.load(open('knowledge/index_sessions.json'))
sessions = d.get('sessions', {})
first = next(iter(sessions.values())) if sessions else {}
fields = {'path', 'tasks', 'status', 'keywords', 'summary'}
missing = fields - set(first.keys())
print('Missing fields:', missing if missing else 'none')
"
```
Expected: `Missing fields: none`

Fix: run `python scripts/session_indexer.py` from project root to (re)build the index.

### 5.4 `knowledge/error_index.md`

```bash
grep -c "^## ERR-\|^# " knowledge/error_index.md
```
Expected: ≥ 1 (file exists with at least a header — `ERR-` entries are added as bugs are fixed).

Entry template verification — each ERR entry must include `### Failed Approaches:` field:
```bash
grep -c "Failed Approaches" knowledge/error_index.md
```
Expected: ≥ 0 (0 is acceptable if no bugs have been fixed yet; any existing ERR entry should have the field).

Fix: if any knowledge file is missing, create it from the schemas in `Implement/01_overview.md`:
- `index_files.json` → empty JSON object `{}`
- `index_variables.json` → empty JSON object `{}`
- `error_index.md` → single line: `# Error Index`

Entry template (each ERR-XXX must include this structure):
```markdown
## ERR-XXX: <Short title>
- Task: T-{N}-{BugID}-{AttemptID}
- File: <path>
- Symptom: <what user saw>
- Root Cause: <why it happened>
- Resolution: <what fixed it>

### Failed Approaches:
- [YYYY-MM-DD] T-{N}-{BugID}-01: <approach tried> → verify failed · Reason: <why it didn't resolve>
```

---

## 6. Scripts (1 required)

### 6.1 `scripts/symbol_indexer.py`

Existence check:
```bash
ls scripts/symbol_indexer.py
```

Run check (must exit without ImportError):
```bash
python3 scripts/symbol_indexer.py --help 2>/dev/null || python3 scripts/symbol_indexer.py 2>&1 | head -5
```

Full integration test:
```bash
python3 scripts/symbol_indexer.py && grep -c '"line"' knowledge/index_variables.json
```
Expected: ≥ 1 symbol with a `"line"` field indexed.

Fix: `Implement/05_scripts.md` → symbol_indexer.py spec → implement the full script.

---

### 6.2 `scripts/lookup.py` — T0 Pre-Read Oracle

Existence check:
```bash
ls scripts/lookup.py
```

Run check (must exit without error):
```bash
python3 scripts/lookup.py "test" --json 2>&1 | head -5
```

Symbol lookup test (should return ≥1 result if index has symbols):
```bash
python3 scripts/lookup.py "export" --json | python3 -c "import json,sys; r=json.load(sys.stdin); print('Results:', len(r))"
```
Expected: `Results: ≥ 1`

Session lookup test:
```bash
python3 scripts/lookup.py "session" --session --json | python3 -c "import json,sys; r=json.load(sys.stdin); print('Session results:', len(r))"
```
Expected: `Session results: ≥ 1` (after session_indexer.py has been run)

Integration: T0 must be called before any grep/Read in `editor/SKILL.md`, `coder/SKILL.md`, `session_manager/SKILL.md §2`.

Fix: `Implement/05_scripts.md §7` → lookup.py spec → implement the full script.

---

### 6.3 `scripts/session_indexer.py`

Existence check:
```bash
ls scripts/session_indexer.py
```

Run check (must exit without error):
```bash
python3 scripts/session_indexer.py 2>&1 | tail -3
```
Expected: last line contains count of sessions indexed (e.g. `Indexed 83 sessions`)

Verify output file updated:
```bash
python3 -c "import json; d=json.load(open('knowledge/index_sessions.json')); print('Sessions:', len(d.get('sessions', d)))"
```
Expected: ≥ 1

Integration: called automatically by `session_manager §3 Step 5` on every session close.

Fix: `Implement/05_scripts.md §8` → session_indexer.py spec → implement the full script.

---

## 7. Docs (1 required)

### 7.1 `docs/master_roadmap.md`

```bash
grep -c "^\- \[[ X/]\]" docs/master_roadmap.md
```
Expected: ≥ 1 task entry using format `- [ ] T-N: <task>`.

Fix: create `docs/master_roadmap.md` with at least one placeholder:
```markdown
# Master Roadmap
- [ ] T-001: Initial setup
```

---

## 8. Failure Patterns (1 required)

### 8.1 `CODING_FAILURE_PATTERNS.md`

```bash
grep -c "^## CFP-" CODING_FAILURE_PATTERNS.md
```
Expected: ≥ 1 pattern entry using format `## CFP-NNN: <title>`.

Fix: create `CODING_FAILURE_PATTERNS.md` with CFP-001 as a placeholder:
```markdown
# Coding Failure Patterns
## CFP-001: Placeholder
Added by setup. Replace with first real pattern when a bug requires ≥2 attempts.
```

**Required baseline patterns to include (copy from source harness):**
- CFP-004 · Read Without Post-Read Verdict → Context Bloat
- CFP-006 · Unbounded Loop → Token Exhaustion

---

## 9. Session Directory (runtime — verify after first task)

These files are created at runtime by Boot B1. Check after the first agent task completes:

```bash
ls .sessions/active_thread.md .sessions/session_tokens.md 2>&1
```
Expected: both exist.

```bash
cat .sessions/active_thread.md
```
Expected: contains `task:`, `phase:`, and `next:` fields.

If missing: start any agent task — Boot B1 creates them automatically.

---

## Summary Verification Script

Run all checks in one pass from `[PROJECT_ROOT]`:

```bash
echo "=== 1. Config Files ===" && \
  grep -c "## Boot\|## R1\|## R4\|## R16\|Per-Turn\|Completion Gate" CLAUDE.md && \
  grep -c "C0\|C1\|C2\|C3\|spawn_tool" AGENTS.md && \
  grep -c "I1\|I2\|I3\|I4\|I5\|I6\|I7\|I8" INVARIANTS.md && \
echo "=== 2. Skill Files ===" && \
  ls .agents/skills/*/SKILL.md | wc -l && \
  grep -l "Context Gate" .agents/skills/*/SKILL.md | wc -l && \
  ls .agents/skills/self_improve/SKILL.md && \
echo "=== 3. Routing ===" && \
  grep -c '"keywords"' .agents/skills/skill-manifest.json && \
  grep -c '"version": "2.1"\|on_demand_files' .agents/skills/skill-manifest.json && \
  grep -c "self_improve" .agents/skills/skill-manifest.json && \
  grep -c "agent\|coder\|editor\|self_improve" .agents/skills/registry.md && \
echo "=== 4. Platform ===" && \
  grep "^platform:" .agents/platform/detected.md && \
echo "=== 5. Knowledge ===" && \
  ls knowledge/index_files.json knowledge/index_variables.json knowledge/index_sessions.json knowledge/error_index.md 2>&1 && \
  python3 -c "import json; d=json.load(open('knowledge/index_sessions.json')); print('Sessions indexed:', len(d.get('sessions', d)))" && \
echo "=== 6. Scripts ===" && \
  ls scripts/symbol_indexer.py scripts/lookup.py scripts/session_indexer.py && \
  python3 scripts/lookup.py "test" --json > /dev/null && echo "lookup.py: ok" && \
echo "=== 7. Docs ===" && \
  ls docs/master_roadmap.md CODING_FAILURE_PATTERNS.md && \
echo "=== ALL CHECKS DONE ==="
```

**Expected output (healthy install):**

```
=== 1. Config Files ===
<number ≥ 6>    ← CLAUDE.md section count (includes R16 + Per-Turn)
<number ≥ 5>    ← AGENTS.md C0-C3 + spawn_tool count
<number ≥ 8>    ← INVARIANTS.md gates I1–I8
=== 2. Skill Files ===
11              ← SKILL.md files (includes self_improve)
11              ← files with Context Gate
.agents/skills/self_improve/SKILL.md  ← confirmed present
=== 3. Routing ===
11              ← keywords entries in skill-manifest.json
≥7              ← manifest v2.1 present + on_demand_files entries
1               ← self_improve in manifest
<number ≥ 4>    ← skill names in registry.md
=== 4. Platform ===
platform: antigravity   (or other known platform — NOT "unknown")
=== 5. Knowledge ===
knowledge/index_files.json
knowledge/index_variables.json
knowledge/index_sessions.json
knowledge/error_index.md
Sessions indexed: <N>    ← ≥ 1 after first session_indexer.py run
=== 6. Scripts ===
scripts/symbol_indexer.py
scripts/lookup.py
scripts/session_indexer.py
lookup.py: ok
=== 7. Docs ===
docs/master_roadmap.md
CODING_FAILURE_PATTERNS.md
=== ALL CHECKS DONE ===
```

Any `No such file` error or count below the expected threshold → locate the section above → apply the Fix action.
