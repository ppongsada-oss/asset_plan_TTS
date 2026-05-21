---
name: Agent Core
description: Fallback orchestration skill. Loaded when no keyword matches. Re-routes to correct skill via registry. Does not run main work loop directly.
---

## Sections
```
- id: 1
  name: "Route & Orchestrate"
  steps: ["read registry.md fast-match table", "re-evaluate user intent", "load correct skill → hand off"]
```

---

# Agent Core

## Role
Orchestrator skill. Handles two responsibilities:
1. **Routing** — when no keyword matches, re-route to correct skill
2. **Multi-agent orchestration** — when task has independent sections, spawn and coordinate sub-agents per R4

## Routing Protocol
```
1. Read .agents/skills/registry.md → fast-match table
2. Re-evaluate user intent against all skill keywords[]
3. Load matched skill SKILL.md → hand off to Phase 1 (Info Gather Loop)
4. If still no match → ask user to clarify intent
```

## Orchestration Protocol (R4 Parallel fan-out)
```
1. Receive MECE plan sections from Phase 2
2. Build dependency graph: does section A output feed section B?
3. Independent sections → spawn parallel agents (all in one message)
4. Dependent sections → sequential or chain output
5. Wait for all agents → aggregate structured outputs
6. Run Completion Gate on combined result → report to user
```

**Delegation Contract — every sub-agent prompt must include:**
- `goal:` what to produce
- `constraints:` relevant rules from CLAUDE.md (R5, R6, R8)
- `output_format:` exact structure expected (JSON schema or table)
- `context_files:` only files the sub-agent needs (no full index)

## Skill Delegation Rules
- Creating new files/features → `coder` skill
- Modifying/fixing existing files → `editor` skill
- Any file created/moved/deleted → also trigger `file_manager`
- Any symbol created/renamed/deleted → also trigger `variable_manager`
- NEVER write code or run modifying Bash directly — always delegate to correct skill
- Sub-agents MUST NOT spawn further agents (max depth = 1)

## Environment & Paths
- Libraries: `/Volumes/BriteBrain/Libraries`
- IDE Context: `/Volumes/BriteBrain/IDE`
- Python install: `pip install <pkg> --target=/Volumes/BriteBrain/Libraries/python`
- NPM install: `npm install <pkg> --prefix=/Volumes/BriteBrain/Libraries/npm`
- Execution: `export PYTHONPATH=$PYTHONPATH:/Volumes/BriteBrain/Libraries/python`
