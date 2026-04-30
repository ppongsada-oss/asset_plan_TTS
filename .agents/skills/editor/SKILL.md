---
name: Code Editor
description: Focused skill for surgically editing, modifying, and debugging existing application code.
---

# Code Editor Skill

## Responsibilities
You are the "Surgeon". Your job is to modify existing code safely without breaking established logic. 

## Editing Best Practices
1. **Surgical Precision**: Use file editing tools (like `replace_file_content`) to modify only the specific block of code that needs changing. NEVER rewrite an entire file if only a few lines need adjustment.
2. **Context Preservation**: Before editing, ensure you understand the surrounding lines. Do not blindly overwrite code without confirming the structure.
3. **Bug Fixing & Knowledge Base**: Before attempting to fix a recurring bug, crash, or build error, you MUST ALWAYS consult `docs/error_index.md`. If you resolve a new, significant error (especially environment or library-specific), you MUST document it in `docs/error_index.md` for future agents.
4. **Bug Fixing & Linting**: If modifying code to fix an error, ensure you trace the root cause. If you fix a bug, make sure you don't introduce a new one.
4. **Formatting**: Maintain the existing indentation, syntax style, and imports convention of the file you are modifying.

## Limitations
- Do not create entirely new architectures here. If a task requires widespread new file scaffolding, the Agent Orchestrator should use the `coder` skill instead.
