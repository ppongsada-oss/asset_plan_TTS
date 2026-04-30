---
name: Agent Core
description: central configuration and orchestration for the AI agent.
---

# Agent Core

## System Overview
Main entry point for AI Agent configuration and process orchestration.

## Primary Directives & Skill Routing (The 6-Step Implementation Loop)
As the Agent Orchestrator, you must manage tasks by routing through specialized skills in this EXACT order:

0. **Memory Recall & Context Switch (`session_manager`)**:
   - MUST DO: Read the active `.sessions/session_xxx.json` file using `view_file` to understand the current progress before acting. 
   - Check: Does the User's request belong to a NEW task? If yes, command Session Manager to close the old JSON and initialize a new Session JSON.
1. **Search & Impact (Pre-Execution)**: Query `index_files.json` & `index_variables.json` using `grep_search`. Trace `backlinks` to evaluate impact.
2. **Roadmap Mapping**: Open `docs/master_roadmap.md`. Change target task from `[ ]` to `[/]`.
3. **Execution Delegation**:
    - **If creating new files/features** ➡️ Use `coder` skill.
    - **If modifying existing files/fixing bugs** ➡️ Use `editor` skill.
4. **Error Handling (If needed)**: If code generates a bug, **consult `docs/error_index.md` first** for known resolutions. If unresolved, log a Bug Task (e.g., `T-XXX-YYY-ZZ`) in the roadmap, use `editor` to fix it, and document the new fix in `docs/error_index.md` before marking `[X]`.
5. **Registry Sync (`file_manager` & `variable_manager`)**: ONLY after code is written, update the JSON indexes (Files, Backlinks, Variables, Associated Tasks) to map the new reality.
6. **Session Control (`session_manager`)**: At the end of the turn, log activities to `.sessions/` and check token compaction.

## Environment & External Paths
- **Libraries/Dependencies**: `/Volumes/BriteBrain/Libraries` (npm, python packages, etc.)
- **IDE Context**: `/Volumes/BriteBrain/IDE`

## Command Patterns
- **Python Install**: `pip install <package> --target=/Volumes/BriteBrain/Libraries/python`
- **NPM Install**: `npm install <package> --prefix=/Volumes/BriteBrain/Libraries/npm`
- **Execution**: When running code, ensure `PYTHONPATH` or `PATH` points to these directories.
    - Example: `export PYTHONPATH=$PYTHONPATH:/Volumes/BriteBrain/Libraries/python`
