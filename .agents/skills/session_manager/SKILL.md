---
name: Session Manager
description: Manages active sessions, logs activities to JSON, and ensures token counts remain under 1200.
---

# Session Manager

## Responsibilities

1. **Auto-Session Rotation (Context Switching)**
   - **Trigger**: When the User asks for a new topic, feature, or task (e.g., moving from T-004 Login to T-007 Master Data).
   - **Action 1 (Close Old)**: Open the current active `.sessions/session_xxx.json`, change its `"status"` to `"completed"` (or `"paused"`), and summarize the final work into `"summary_context"`.
   - **Action 2 (Open New)**: Create a **brand new** JSON file (e.g., `session_003_master_data.json`) with a clean History array to isolate the context.

2. **Schema Definition**:
   ```json
   {
     "session_id": "session_003_master_data",
     "associated_tasks": ["T-007"],
     "status": "in_progress",
     "summary_context": "",
     "History": []
   }
   ```
3. **Continuous Logging**: At the end of every interaction round, append your latest action to the `History` array in the *currently active* session file.
4. **Token Limitation & Compaction**:
   - Run `python scripts/session_compactor.py .sessions/<current_session>.json` to check the size of the history.
   - If the script outputs `STATUS: EXCEEDS_LIMIT`, it means the session history is > 1200 tokens.
   - **YOUR EXPLICIT JOB**: You must truncate the `History` array, keeping ONLY the last 4-6 logs. Read the extracted older logs, summarize them into a single comprehensive technical text, and append/update it in the `summary_context` field of the JSON. Do this using your file editing tools.
5. **Project Synchronization**: Always consult and update `docs/master_roadmap.md` to tick off checklists when a session completely finishes.
