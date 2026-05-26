---
name: Coder (Creator)
description: Focused skill for implementing new features and creating application files.
---

## Sections
```
- id: 1
  name: "Scope & Index"
  steps: ["R4 scope probe", "check index_files + index_variables for conflicts", "confirm no duplicates"]
- id: 2
  name: "Build"
  steps: ["create files to standards", "write code", "self-correct linter errors", "[✓ written] verify each file"]
- id: 3
  name: "Sync & Close"
  steps: ["call file_manager", "call variable_manager", "python scripts/symbol_indexer.py", "roadmap [X]"]
```

# Coder Skill

## Responsibilities
You are the "Builder". When the Agent delegates a new feature task to you, focus on writing robust, error-free code and establishing new files.

## Roadmap Protocol (MANDATORY — before and after every task)

**Before writing any code:**
```
1. python scripts/lookup.py "<feature topic>" --session --json
   → check if a prior session already built or attempted this feature
   → High-score match: Read that session JSON → review files_changed[] and History[]
     to understand what was built, what approach was used, what was left incomplete
   → No match or irrelevant: proceed to step 2
2. grep docs/master_roadmap.md for existing task matching this work
   → Found: note the Task ID (e.g. T-017) → set status [/] (in progress)
   → Not found: assign next T-<N> → add [ ] T-<N>: <description> to roadmap
3. Note the Task ID — all work in this session is under that ID
```

**After completing code:**
```
1. Mark roadmap: [X] T-<N>: <description> · session_<NNN>
2. Call file_manager + variable_manager to sync indexes
```

## Coding Standards (Cloudflare & Next.js)
1. **Framework Strictness**: Follow standard directory conventions for new files (`src/app/`, `src/components/`, etc.).
2. **Database Integrity**: When creating Drizzle schemas, ensure they match the Technical Requirements Document carefully.
3. **Self-Correction (Linter)**: If you notice a TypeScript error or Linter warning while writing, fix it immediately before finishing your execution.
4. **Aesthetics & UI**: Use TailwindCSS standard utility classes. Strive for a minimalist, modern enterprise look.
5. **Local Staging**: When generating large files or major architectural components, write them to a temporary staging area (e.g., `/tmp/` or local `temp/` inside the project) first using your creation tools, verify their structure, and then move them to their final destination. This prevents token waste on failed direct file injections.

**Staged file cleanup:** If a staged write fails or is abandoned mid-task:
- Delete the staged file immediately
- Emit `[staged-drop] <path>` to signal that this content must not appear in subsequent context or `context_files:`

## Read Protocol

For every file read during task execution: follow R5 (grep → [pre-read] → offset+limit).
After each Read result, emit verdict immediately:
```
**[post-read]** File: `<path>` · Verdict: relevant|partial|irrelevant
```
- `irrelevant` → drop from context · do NOT include in `context_files:` when spawning sub-agents
- `partial` → keep excerpt only (note line range) · discard remaining content
- `relevant` → keep in working context

Skipping verdict = CFP-004 violation. Every Read needs a verdict.

## Limitations
- Do **NOT** manipulate `.agents/` or `*.json` index files directly — call `file_manager` + `variable_manager` skills after creating files.
- **DO** update `docs/master_roadmap.md` — roadmap entries are mandatory (see Roadmap Protocol above).
- Source work scope: `src/`, `wrangler.toml`, `package.json`, `next.config.ts`.

## Flow Diagram Rule
Creating any `.md` file that contains a flow diagram or architecture chart → **load `ascii_flow` skill first**.
```
[→ ascii_flow] Before drawing any box diagram in <file>
```
Style reference: `knowledge/harness_flow_20260525.md` · Skill: `.agents/skills/ascii_flow/SKILL.md`
