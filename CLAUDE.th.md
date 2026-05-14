# CLAUDE.th.md — คู่มือสำหรับ User (Asset Plan)

> ไฟล์นี้เป็นเวอร์ชันภาษาไทยสำหรับ user อ่านทำความเข้าใจเท่านั้น
> Claude ใช้ CLAUDE.md (English) เป็นต้นฉบับ — ไม่อ่านไฟล์นี้

---

## ทำไมถึงมี Rules เหล่านี้?

CLAUDE.md ควบคุมพฤติกรรมของ Claude ใน Asset Plan โดยเฉพาะ
มี 2 ชั้น: Global rules (R1-R10) + Project-specific rules (R4, R6, R7)

---

## Boot Sequence
ทุก session Claude จะ:
1. ดู session ล่าสุดใน .sessions/ ว่างานค้างอะไรอยู่
2. เช็ค roadmap ว่า task ถัดไปคืออะไร
3. แจ้งสถานะบรรทัดแรกก่อนทำงาน

---

## R1 · Token Footer
Claude แสดง `*(Session output: ~NNN tokens)*` ท้ายทุก response
ตัวเลขสะสมตั้งแต่ต้น session และเขียนลง `.sessions/session_tokens.md` ทุกครั้ง
- เมื่อเห็นใกล้ 15k → เตรียมรับคำเตือน
- เมื่อเห็นใกล้ 30k → เตรียม /clear
- หลัง /clear ทุกครั้ง: ล้างไฟล์กลับเป็น SESSION_OUTPUT_TOTAL: 0

## R2 · Tool Budget
จำกัด 5 tool calls ต่อ 1 response ป้องกัน Claude วนลูป

## R3 · Output Limit + Handoff
- >15k → แจ้งเตือน + เรียก token_auditor skill
- >30k → หยุด → /compact → ถ้ายังใหญ่ → สร้าง Handoff Brief

Handoff Brief คือสรุปงาน ≤600 tokens ใน .sessions/session_handoff.md
ให้ /clear แล้ว paste brief → session ใหม่ต่อยอดแบบไร้รอยต่อ

## R3.5 · Sub-agent
งานค้นหาขนาดใหญ่ Claude spawn sub-agent แยก ป้องกัน context หลักบวม

## R4 · Index-First Lookup (สำคัญมากสำหรับ project นี้)
ลำดับบังคับก่อนแก้ไขไฟล์ใดๆ:
1. grep ใน knowledge/index_variables.json หา symbol
2. grep ใน knowledge/index_files.json หา file path
3. ได้เลขบรรทัดแล้วค่อย Read แบบ offset/limit
ห้าม Read ไฟล์ทั้งหมดโดยไม่มี offset/limit เด็ดขาด

## R5 · Output Filter
Claude filter output Terminal ก่อนส่งคืน ไม่ dump raw

## R6 · Index Sync
ทุกครั้งที่สร้าง/ลบ/ย้ายไฟล์หรือ symbol → อัปเดต knowledge/ indexes ทันที
รัน `python scripts/symbol_indexer.py` หลังเปลี่ยน symbol

## R7 · Error Protocol
ก่อน debug ทุกครั้ง → ค้น knowledge/error_index.md ก่อนเสมอ
ถ้าเป็น error ใหม่ → เพิ่ม roadmap task → fix → กำหนด ERR code → เขียน index

## R8 · English-first Analysis
งาน analysis ซับซ้อน Claude เขียน outline English ก่อน สรุปไทย
ประหยัด token ส่วน reasoning ~50%

## R9 · Tool Result Cap
ตัด output ที่ยาวเกิน 300 บรรทัด ป้องกัน context บวม

## R11 · Scope Probe
ก่อนเริ่ม task ใหญ่ทุกครั้ง Claude รัน 1 Bash command นับขนาดงานก่อนเสมอ ไม่เดาเอง
- < 5 files / < 300 lines → ทำใน main context ปกติ
- ≥ 5 files / ≥ 300 lines → spawn Explore sub-agent → รับ summary ≤500 tokens → ทำงานต่อจาก summary

## R10 · Response Density
Claude ตอบ table/bullet แทน prose ใช้ token น้อยกว่า ~40%

---

## Knowledge Base Files
| ไฟล์ | ใช้ทำอะไร |
|------|----------|
| `knowledge/index_files.json` | backlinks ทุกไฟล์ในโปรเจกต์ |
| `knowledge/index_variables.json` | symbols + บรรทัดที่อยู่ |
| `knowledge/error_index.md` | ERR codes ที่เคยเจอ |
| `docs/master_roadmap.md` | task checklist |
| `.agents/skills/registry.md` | skill routing |
| `.sessions/session_*.json` | state ของแต่ละ session |
