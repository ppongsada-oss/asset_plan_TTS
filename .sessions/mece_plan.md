## Phase 0 — Boot (once per session · keep [X] on resume · DO NOT reset)
### Files Read
| File | Tool | TH ch | EN ch | ~Tok |
|---|---|---|---|---|
| .sessions/compact_state.md | `cat` (B1: if dt=today → [compact-restore]) | ___ | ___ | ___ |
| .sessions/active_thread.md | `wc -m` + python TH/EN | ___ | ___ | ___ |
| skill-manifest.json (grep) | `grep keywords \| wc -m` (skip if [compact-restore]) | ___ | ___ | ___ |
| .agents/skills/<name>/SKILL.md | `wc -m` + python TH/EN (skip if sk_h match) | ___ | ___ | ___ |
| .agents/skills/mece/SKILL.md (offset=31 limit=110) | `wc -m` + python TH/EN (skip if mece_h match) | ___ | ___ | ___ |
Phase 0 total: TH ___ch · EN ___ch → ~___tok

→ Carry forward: skill_name=___ · CFP_COUNT=___ · task=___

- [ ] B1: compact_state.md checked (dt=today? → [compact-restore]) · active_thread read · SESSION_TOTAL=0/loaded · CFP_COUNT stored
- [ ] B2-B3: [compact-restore] → sk= parsed + sha1 checked · OR manifest grep + SKILL.md read · sections[] loaded
- [ ] C0-C3: routing confirmed · no topic switch
→ TOKEN CHECK (runtime · NOT at plan creation): `printf "SESSION_TOTAL: ___k\n" > .sessions/session_tokens.md` (fill ___k from working memory) · `cat .sessions/session_tokens.md` → ___k

---

## Phase 1 — Info Gather
### Files Read
| File | Tool | TH ch | EN ch | ~Tok |
|---|---|---|---|---|
| <file> | `wc -m` or `grep \| wc -m` | ___ | ___ | ___ |
Phase 1 total: TH ___ch · EN ___ch → ~___tok

- [ ] G1: ALL sections scanned (1 pass)
- [ ] G2: batch greps + targeted reads · [post-read] verdicts emitted
- [ ] G3: every section → file/symbol + Verify-N · [✓ gather] emitted
- [ ] gather_complete.md written today
→ TOKEN CHECK (runtime · NOT at plan creation): `printf "SESSION_TOTAL: ___k\n" > .sessions/session_tokens.md` (fill ___k from working memory) · `cat .sessions/session_tokens.md` → ___k  (>60k → TOKEN PAUSE)

---

## Phase 2 — Plan
### Files Read
| File | Tool | TH ch | EN ch | ~Tok |
|---|---|---|---|---|
| .agents/skills/mece/SKILL.md (offset) | `sed -n 'N,Mp' \| wc -m` | ___ | ___ | ___ |
Phase 2 total: TH ___ch · EN ___ch → ~___tok

- [ ] M2: plan 1:1 sections · Skill: + Tool: per section · ≥2 Verify-N
- [ ] M3: user confirmed · M4: roadmap entries written
- [ ] M5: [✓ MECE] emitted · mece_plan.md written today
→ TOKEN CHECK (runtime · NOT at plan creation): `printf "SESSION_TOTAL: ___k\n" > .sessions/session_tokens.md` (fill ___k from working memory) · `cat .sessions/session_tokens.md` → ___k  (>60k → TOKEN PAUSE)

---

**[✓ MECE]** Goal: ___

Section 1 — ___:
  Skill:    ___
  Tool:     ___
  Constraints:
    - ___
  Steps:
    - [S1-A] ___
  Verify:  ___
  Rollback: ___
  Data_Sent: Thai ___ch | ENG: ___ch  ← fill AFTER section completes
  Token:    ___k                       ← fill AFTER section completes

---

## Phase 3 — Execute + Close
- [ ] S1 [✓ written] + Verify PASS
      Data_Sent: TH ___ch · EN ___ch
      → TOKEN CHECK (runtime · NOT at plan creation): `printf "SESSION_TOTAL: ___k\n" > .sessions/session_tokens.md` (fill ___k from working memory) · `cat .sessions/session_tokens.md` → ___k
- [ ] S<N> [✓ written] + Verify PASS
      Data_Sent: TH ___ch · EN ___ch
      → TOKEN CHECK (runtime · NOT at plan creation): `printf "SESSION_TOTAL: ___k\n" > .sessions/session_tokens.md` (fill ___k from working memory) · `cat .sessions/session_tokens.md` → ___k
      (>50k → /compact · >60k → TOKEN PAUSE)
- [ ] R8 index sync done (if files/symbols changed)
- [ ] Roadmap [X] all sections annotated
- [ ] active_thread.md → phase: done
- [ ] Write Phase 0 carry-forward → `.sessions/session_handoff.md` (Tool: Write): `skill_name + CFP_COUNT + task` — survives /compact
- [ ] SESSION_TOTAL written: `printf "SESSION_TOTAL: ___k\n" > .sessions/session_tokens.md` (fill ___k from working memory · do NOT hardcode 0k at plan creation)
- [ ] Write compact_state.md (BEFORE /compact — session memory intact) (Tool: Bash): fill dt/sk/sk_h/mece_h/p3 → `.sessions/compact_state.md`
      → Tool MUST be Bash (needs sha1sum + printf — NOT Write tool)
      → format: `dt=<today> s=___k task=___ cfp=___\nsk=___ sk_h=<8chars> mece_h=<8chars>\np1=done p2=done p3=___`
      → see session_manager/SKILL.md §Step 5.3 for exact Bash command · enables B1 [compact-restore] → saves ~2.9k tokens next task
- [ ] /compact — ALWAYS run at task complete (carry-forward written FIRST · prevents next-task context bloat)
      → ✅ เมื่อ compact แล้ว แจ้ง user: "compact เรียบร้อยครับ session ใหม่เริ่มได้เลย ไม่ต้องรัน /compact เอง"
- [ ] [mece-audit] all Verify-N PASS confirmed
- [ ] self_improve: `grep -c "^## CFP-" CODING_FAILURE_PATTERNS.md` → if > boot_count → review
- [ ] harness_doctor: `grep -c "recurred_after_fix" knowledge/index_cfp_fix.json` → if ≥1 → trigger
- [ ] Ask user: "มีอะไรผิดปกติในการทำงานไหมครับ?"
- [ ] Feedback & Error Summary delivered
