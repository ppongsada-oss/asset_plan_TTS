<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

<!-- BEGIN:agent-orientation -->
# Agent Orientation — Read Before Acting

You are operating inside the **Asset Plan** project. The rules below apply to ALL agents regardless of vendor (Claude, GPT, Gemini, or other).

> **Full hard constraints live in `CLAUDE.md`.** This file is your orientation map — CLAUDE.md is the law.

---

## Boot Sequence (3 tool calls max — match CLAUDE.md exactly)

```
[B1] Bash: (phase=$(grep "^phase:" .sessions/active_thread.md 2>/dev/null | awk '{print $2}'); [ "$phase" != "in_progress" ] && printf "SESSION_TOTAL: 0\n" > .sessions/session_tokens.md; cat .sessions/active_thread.md 2>/dev/null | tail -4; echo "---"; cat .sessions/session_tokens.md 2>/dev/null; echo "---"; grep -n "\[/\]" docs/master_roadmap.md 2>/dev/null | head -3)
[B2] Read: .agents/skills/skill-manifest.json → match user intent to keywords[] → identify skill_name
[B3] Read: .agents/skills/<skill_name>/SKILL.md → load sections[] and context_files
```

- B1 auto-resets SESSION_TOTAL to 0 when phase ≠ in_progress (new session guard — runs before read)
- Load `SESSION_TOTAL` from B1 into working memory (no further file reads for tokens this session)
- If `SESSION_TOTAL > 60k` → warn user immediately before proceeding

**Reply line 1 — Boot trace (required):**
```
**[Boot]** Thread: <done|in_progress> · Tasks: <N open> · Skill: `<name>` · Sections: <N> · Tokens: ~<N>k
```

---

## Trace Formats — Emit on Every Decision

Mid-task (routing / protocol decisions):
```
**[→ skill]**   Match: `<keyword>` → `<skill>` · Loaded: `<files>`
**[R9]**        Search: `<keyword>` → <ERR-XXX found: applying | not found: new ERR>
**[R8]**        Event: <edit|create|delete> · Running: symbol_indexer.py
**[index]**     Lookup: `<Symbol>` → line <N> · used_in: <N files>
**[tokens]**    Input est: ~NNN · Output est: ~NNN · Running: ~NNk
**[MECE]**      ✓ Section <N> done · → Section <N+1> next | ✓ All done · Thread: done
```

Gate-confirmation (required, not optional):
```
**[✓ gather]**  Context sufficient after <N> reads · proceeding to MECE
**[✓ MECE]**    Plan covers <N> sections · user confirmed · roadmap entries added
**[✓ R9]**      3-checks: error_index ✓ · symbol_index ✓ · file_index ✓ → proceeding
**[✓ written]** grep `<key>` in `<file>` → found line <N> ✓
**[loop]**      Section <S>/<N> · step `<name>` → <execute|verify|done>
**[blocked]**   Section <S> `<step>` failed 2× → reason: `<cause>` · waiting for user
**[pause]**     SESSION ~<N>k > 60k · done: <X>/<N> sections · saving state · asking user
**[resume]**    Config reloaded · MECE: <reused|rebuilt> · resuming section <N>
```

---

## Per-Turn Routing Check (every user message)

Boot selects a skill for the first task only. **Every new user message requires a fresh intent check.**

```
[C1] Read user message → extract intent keywords
[C2] Match keywords against skill-manifest.json skills[].keywords
[C3] Does matched skill == currently loaded skill?
      ├─ Yes → continue. No re-read needed. Emit nothing.
      └─ No  → Read .agents/skills/<new_skill>/SKILL.md
               Emit: **[→ skill]** Match: `<keyword>` → `<new_skill>` · Loaded: `<sections>`
               Replace loaded skill in working memory → proceed with new skill
```

| Context change example | Re-route to |
|---|---|
| Was editing code → user says "ปิด session" | `session_manager` |
| Was in session work → user reports a bug | `editor` |
| Was debugging → user asks to add a new page | `coder` |
| Continuing same task type | Stay on current skill |

**Same session ≠ same skill.** Never stay locked on one skill when the task type changes.

---

## Loop Architecture — All Work Runs Through 3 Phases

**Full spec in CLAUDE.md §"Loop Architecture".** Summary:

| Phase | Name | What happens |
|-------|------|--------------|
| 1 | Info Gather Loop | Repeat: identify missing context → R5 index-first lookup → assess sufficiency → emit `[✓ gather]` |
| 2 | MECE Plan | Load mece/SKILL.md → build plan (1:1 section map) → define `Verify-N: \`<cmd>\` → expected: <result>` for each section → user confirms → add to roadmap |
| 3 | Execution Loop | SECTION LOOP → REACT LOOP (Select → Execute → Observe → Verify → Decide) → write session_handoff.md |

Phases 1–2 run **once per task**. On resume: skip to Phase 3 at pending section.

**Completion Gate — agent may NOT report done until all pass:**
```
□ All N Skill sections executed (tool calls — not just described)
□ Every write/edit has [✓ written] grep verification
□ R8 Index Sync done (if files/symbols changed)
□ Roadmap entries → [X]
□ active_thread.md → phase: done
□ SESSION_TOTAL written → .sessions/session_tokens.md
```

---

## Backlink Rule — Edit One File, Check All Dependents

**Before editing any file:**
```bash
grep -A 6 '"src/path/to/file.tsx"' knowledge/index_files.json
```
→ Check `"backlinks"` array — every file listed there **imports or depends on the file you are about to edit**.

**Obligation:**
| Situation | What you must also do |
|-----------|----------------------|
| You change a function/type signature | Update every caller listed in `used_in` (from `index_variables.json`) |
| You rename or move a file | Update every `import` in every backlink file + update `index_files.json` |
| You delete a file | Remove all `import` lines in backlink files + remove all `used_in` entries |
| You add a new export | Add to `index_variables.json` with `source`, `line`, `used_in: []` |
| You remove an export | Remove from `index_variables.json` + clean all `used_in` references |

**Never edit a file without checking its backlinks first.** Blast radius = number of files in `backlinks[]`.

---

## Key Rules (Quick Reference — Full rules in CLAUDE.md)

| Rule | Requirement |
|------|-------------|
| Token footer | R1: every response ends with `*(Session total: ~NNN tokens)*`. Estimate: thai×1.7 + en×0.3. |
| Response format | R7: table/bullet over prose. Comparison→table, steps→numbered, enumeration→bullet. |
| Language | R11: reasoning >5 steps → English outline first → Thai summary only. |
| File reads | R5: grep index first → get line → `Read offset+limit=60`. Emit `[pre-read]` before every Read. |
| Symbol edits | R5: before editing ANY symbol → `grep -A 8 '"Symbol"' knowledge/index_variables.json` → check `used_in` → emit `[pre-edit]`. Skip = violation. |
| Tool calls | R2: max 5/turn. Retry max 2×; diagnose on 2nd fail. |
| Session pause | R3: >60k tokens → TOKEN PAUSE. >90k → HALT immediately. |
| Scope probe | R4: run 1 Bash probe before starting. ≥5 files or ≥300 lines → spawn sub-agent. |
| Error protocol | R9: grep error_index → grep symbol_index → grep file_index (all 3, in order) before any fix. |
| Index sync | R8: every file/symbol create/delete/rename → update knowledge/ indexes + run symbol_indexer.py. |
| Backlinks | Check backlinks BEFORE every edit (see Backlink Rule above). |
| Verification | R12: every write action verified by grep or Verify-N command before reporting success. |
| Escalation | R13: AttemptID = 02 → STOP, emit `[blocked]`, wait for user. Never auto-retry a 3rd time. |
| Destructive gate | R14: delete/overwrite/`src/db/` edit/batch (>5 files)/out-of-scope → emit `[gate]` and wait confirm. |
| DB hard stop | R15: ANY change to `src/db/` or DB-typed symbol → emit `[db-gate]` → HALT until explicit "yes". No exceptions. |
| Roadmap | R-Roadmap: every task logged before execution. `[ ]` → `[/]` → `[X] (→ ERR-XXX)`. |
| Manual close | session_manager §3: "ปิด/close/done" → 5 file writes required before confirming close. |
| Topic switch | New task = new session JSON. Never carry raw history across tasks. |

---

## Project Structure (Quick Reference)

```
CLAUDE.md                        ← Hard constraints (always read first)
AGENTS.md                        ← This file — orientation map
knowledge/index_files.json       ← File registry + backlinks (check BEFORE every edit)
knowledge/index_variables.json   ← Symbol registry (components, functions, DB tables)
knowledge/error_index.md         ← ERR-XXX codes (search FIRST before debugging)
docs/master_roadmap.md           ← Task checklist and progress
.agents/skills/skill-manifest.json ← Keyword → skill routing (read at Boot B2)
.agents/skills/<name>/SKILL.md   ← Skill definition (read at Boot B3)
.sessions/active_thread.md       ← Current task phase (read at Boot B1)
.sessions/session_tokens.md      ← SESSION_TOTAL (read at Boot B1)
src/app/                         ← Next.js app router
src/db/                          ← Drizzle ORM schema and DB connection
```

---

## Critical Project-Specific Rules

- **Miniflare D1 (local):** Never use `onConflictDoNothing()` or multi-row INSERT — both fail silently. Use SELECT+filter+single-row-insert. (ERR-007)
- **Edge Runtime:** No Node.js APIs (`bcryptjs`, `setImmediate`, etc.). Use WebCrypto only.
- **CSV parsing:** Always PapaParse — never `split(",")` or `split("\n")` manually.
<!-- END:agent-orientation -->
