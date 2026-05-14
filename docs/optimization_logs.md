# AI Auto-Optimization & Token Audit Logs

This file contains automatically generated lessons and optimization rules created by the `token_auditor` skill when wasteful token consumption (>8,000 tokens) is detected.

## Audit Logs
*(Logs will be appended below by the token_auditor)*

### 2026-05-06 | Session 037
- **Total Estimated Tokens**: ~8,500
- **Root Cause**: Excessive file reading. The agent read `EquipmentTable.tsx` (591 lines) and `route.ts` (126 lines) in their entirety without using line-bound `view_file` or `grep_search` first. This violation of "Surgical File Reading" caused high token burn.
- **Auto-Correction Rule**: **RULE-TOKEN-001**: NEVER use `view_file` on a file > 100 lines without `StartLine`/`EndLine`. Always use `grep_search` to find relevant blocks first.
- **Skill Optimized**: `agent` & `editor`


## 2026-05-06 | Session 038
- **Total Tokens**: ~9,850
- **Root Cause**: High overhead from 17 conversation summaries in system prompt (~15KB) + reading rule files (CLAUDE.md, registry.md) in full at boot.
- **Auto-Correction Rule**: Use 'grep' to extract specific rules from CLAUDE.md instead of reading the entire file when performing standard boot checks.
