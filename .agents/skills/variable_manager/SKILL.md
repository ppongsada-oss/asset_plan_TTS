---
name: Variable Index Manager
description: Tracks variable, function, and component definitions and usage in index_variables.json.
---

# Variable Index Manager

## Triggers (WHEN to step in)
You must execute your duties on `index_variables.json` ONLY under these conditions:
1. **Creation**: A major Component (e.g., `LoginForm`), Database Entity, or reusable API logic is declared.
2. **Usage Link**: An existing variable is called/imported into a new location -> Append that location to the `used_in` array.
3. **Rename/Refactor**: A variable's name changes -> Update the JSON key AND immediately trace all files in `used_in` to rename those call sites via the `editor` skill.
4. **Deletion**: A component or variable is permanently removed -> Erase it from the JSON.

## Pre-Analysis Role
Before doing any structural refactoring, query this index to find all dependencies that rely on a specific variable to ensure zero downtime.
