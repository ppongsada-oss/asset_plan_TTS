# Master Project Roadmap: Asset Plan

> **📌 CURRENT ACTIVE FOCUS:** Phase 1 - Project Initialization & Architecture Setup
> **📊 OVERALL PROGRESS:** 100%

---

---

## 📚 System Documentation (Governance)
- `docs/master_roadmap.md`: แผนงานหลัก (อัปเดตตลอด)
- `docs/domain_rules.md`: กฎและ Business Logic ที่ตายตัว
- `knowledge/error_index.md`: แหล่งรวมความรู้ (Knowledge Base) สำหรับแก้ Bug และ Error ในระบบ
- `docs/ui-standards.md`: มาตรฐานการออกแบบ UI ของโปรเจกต์ (session_refine_center_hub)
- `knowledge/harness_flow_th.md`: สรุปขั้นตอนการทำงานของ Agent Harness (ภาษาไทย)
- [X] T-063: จัดทำเอกสารสรุปขั้นตอนการทำงานของ Agent Harness ใน Knowledge Base · attempts: 1 · tool_calls: 5
  - [X] T-063.1: เพิ่มไฟล์แผนภาพการทำงาน (Flowchart) ของ Agent Harness · attempts: 1 · tool_calls: 4

---

## 🖥️ Page 0: Project Foundation (System Level)
**Goal:** วางระบบโครงสร้างพื้นฐาน

### Feature 0.1: Core Agent Workflow
- [X] T-000: วางโครงสร้างโฟลเดอร์ไฟล์, สถาปัตยกรรม .agents และระบบ Index JSON

### Feature 0.2: Web Application Framework Setup
- [X] T-001: สร้าง Frontend App
- [X] T-002: สร้าง Backend App / API & Database Connection
- [X] T-002.1: เพิ่มระบบ Cache Optimization (SWR) และ Custom Hooks (session_042)
- [X] T-002.2: แก้ไขปัญหา Wrangler KV และ Cloudflare Environment (session_043)
- [X] T-002-002-01: ปรับแต่งให้ local development เชื่อมต่อตรงกับ Cloudflare D1 รีโมตจริงและลบ HTTP seed endpoints (→ ERR-029) · attempts: 1 · tool_calls: 10
- [X] T-003: ตั้งค่า Authentication Framework

---

## 🖥️ Page 1: Login & Security (User Management)
**Goal:** ระบบเข้าสู่ระบบและจัดการสิทธิ์อ้างอิงจาก Sheet สารบัญ

### Feature 1.1: Authentication UI & State
- [X] T-004: สร้างหน้า Login UI (Priority: UI-First)
- [X] T-005: ต่อ API Login & จัดการ JWT Token
- [X] T-005-001-01: แก้ไข seed API ใน localhost ให้สิทธิ์ ADMIN แก่ผู้ใช้อย่างถูกต้อง (→ ERR-028) · attempts: 1 · tool_calls: 10

### Feature 1.2: Security Control
- [X] T-006: สร้างระบบปกป้องสิทธิ์ราย Project (Password/Role)
- [X] T-006.1: ระบบตรวจสอบสิทธิ์การเข้าถึง Project รายบุคคล (session_012)
- [X] T-001-001: แก้ไขปัญหา Navbar แสดงผลซ้ำซ้อน (Duplication) (session_037 -> ERR-012)

---

## 🖥️ Page 2: Master Data Management
**Goal:** หน้าจอสำหรับตั้งค่าอุปกรณ์และโครงการ ข้อมูลพื้นฐานจาก Excel Sheet: ประวัติการซื้อและเช่า, รวบรายการ

### Feature 2.1: Equipment Catalog
- [X] T-007: สร้าง UI สำหรับจัดการรายการอุปกรณ์ 21 หมวดย่อย
- [X] T-008: สร้าง Database Schema `equipment_items` และ API CRUD
- [X] T-008.5: ระบบลงทะเบียนหมวดหมู่ (Categories) และจัดการยอดคงเหลือ (Remaining Stock)
- [X] T-008.6: ระบบ Category & Subcategory Preview และ Export ข้อมูลเป็น Excel (→ T-077) · attempts: 1 · tool_calls: 1
- [X] T-008.7: หน้าต่างขยายดูรายการอุปกรณ์ภายใต้หมวดหมู่ย่อย และระบบแนะนำรหัสอัตโนมัติ (→ T-077) · attempts: 1 · tool_calls: 1
- [X] T-008.8: ปุ่มเพิ่มหมวดหมู่หลักพร้อมระบุ Alphabet ตัวถัดไปอัตโนมัติ (→ T-077) · attempts: 1 · tool_calls: 1



### Feature 2.2: Data Initialization & Import
- [X] T-009: สร้างฟังก์ชัน Import/Migration ข้อมูลจาก Excel เข้า DB
- [X] T-009.1: แก้ไข Bulk Upload route — FK constraint + CSV quoted-field parser (session_023)
- [X] T-038: เพิ่มการแสดงยอด Site Inventory ในหน้า Admin Project (session_038)
- [X] T-040: ปรับฟิลด์ Stock ในหน้า Admin ให้เป็น Read-only (session_040)
- [X] T-038-001-01: แก้ไข Bug Tooltip โดน Card ทับ (overflow-hidden) ในหน้า Admin Projects (→ ERR-027) · attempts: 1 · tool_calls: 10


---

## 🖥️ Page 3: Warehouse & Inventory Management (Store Center)
**Goal:** ฝั่งคลังสินค้ากลางรับแผนจากไซด์เพื่อจัดหา หมุนเวียน และสรุป Buy/Rent

### Feature 3.1: Center Workflows & Dashboard
- [X] T-010: สร้างหน้า Dashboard สรุปคำขอจากทุก Site
- [X] T-011: สร้างระบบคำนวณ Net Demand (Delta) และจัดการหมุนเวียน (Circulation) / เบิกจ่าย (Dispatch)
- [X] T-012: สร้างระบบบันทึกมติจัดหา (Rent vs Buy) และสลับสเปก (Substitute)
- [X] T-033: ระบบ Action History และการบันทึกประวัติการตัดสินใจ (session_033)
- [X] T-034: ระบบ Batch Actions สำหรับการอนุมัติหลายรายการพร้อมกัน (session_034)
- [X] T-044: ปรับปรุง UI Store Center Dashboard ให้รองรับ Dual-column layout (session_044)
- [X] T-056: เพิ่มการแสดงชื่อโครงการเต็มในการ์ดงวดงาน (Job Management)
- [X] T-056.1: เพิ่มปุ่มกดปลดล็อคการ์ดงวดงานที่โดน Lock (โดย Store Center), แสดงเวลาอัปเดตล่าสุด และแสดงจำนวนวันล่าช้าเทียบกับ Deadline (session_071) · attempts: 1 · tool_calls: 18
  - [X] T-056.1.1: Diagnose (Check error_index, schema definition, and blast radius of new columns)
  - [X] T-056.1.2: Edit & Verify (Modify schema, generate/apply remote migration, update APIs & UI)
  - [X] T-056.1.3: Sync & Close (Index sync, mark completed, close session)
  - [X] T-056.1-BUG-01: ปรับปรุงปุ่มปลดล็อคให้อินแอคทีฟกรณีไม่ถึงกำหนด และแสดงเวลาคงเหลือก่อนโดนล็อค (→ ERR-030) · attempts: 2 · tool_calls: 38
  - [X] T-056-002-01: ปรับปรุงการเลือกเดือนเป้าหมายในหน้าสร้างงวดงานใหม่ ให้รองรับปีถัดไป (→ ERR-031) · attempts: 1 · tool_calls: 51
- [X] T-011-002-01: แก้ไขตัวเลขแสดงผลบน Tab ใน Store Center Hub ให้ถูกต้อง (→ ERR-022) · attempts: 1 · tool_calls: 12
- [X] T-011.1: เพิ่มคอลัมน์ Running Number (#) ใน Store Center Hub (session_056) · attempts: 1 · tool_calls: 3
- [X] T-011.2: เพิ่มคอลัมน์ Running Number (#) ใน PM Review Table (session_056) · attempts: 1 · tool_calls: 3
- [X] T-011.3: เพิ่มคอลัมน์ Running Number (#) ใน Planning Worksheet (Site) (session_056) · attempts: 1 · tool_calls: 1
- [X] T-011.4: ปรับปรุงหัวตาราง (Header Polish) ให้สวยงามและสมบูรณ์ในทุก Dashboard (session_056)
- [X] T-011-003-01: แก้ไข 500 Error และ Variable Inconsistency ใน Store Center Hub (→ ERR-028) · attempts: 1 · tool_calls: 15

---

## 🖥️ Page 4: Project Asset Planning (Site)
**Goal:** หน้าจอสำหรับ Site ในการวางแผนและขออนุมัติ

### Feature 4.1: Site Planning & Approval
- [X] T-013: สร้างหน้าจอให้ Store Site กรอก/ร่าง (Draft) แผนการใช้อุปกรณ์
- [X] T-013.1: ระบบช่วยกรอกข้อมูลอัตโนมัติ (Auto-fill) สำหรับเดือนถัดไป (session_027)
- [X] T-013.2: แยกสถานะช่องว่าง (ยังไม่ระบุ) และ 0 (ไม่มีความต้องการ) (session_028)
- [X] T-013.3: แก้ไขสถานะเริ่มต้นให้เป็นช่องว่างแทนเลข 0 (session_029)
- [X] T-014: สร้างหน้าจอให้ Project Manager (PM) กด Approve เพื่อส่งเข้า Center
- [X] T-014.5: ระบบจัดการยอดคงเหลือหน้างาน (Site Inventory) สำหรับ Store Site
- [X] T-015: API บันทึก/อัปเดต สถานะ `Pending -> Approved -> Procured`
- [X] T-014.1: แก้ไข Workflow การ Reject งานของ PM (session_030, session_031)
- [X] T-014.2: เพิ่มการ์ดสรุปประวัติการอนุมัติในหน้า PM Approval Hub (session_063)
- [X] T-032: ระบบ Interactive Table Sorting สำหรับทุกตารางหลัก (session_032)

---

## 🖥️ Page 5: Cross-Project Reporting
**Goal:** หน้าจอ Reporting จาก Combine (2) และ Combine (3)

### Feature 5.1: Combine Summary & Matrix
- [X] T-015: สร้างหน้าจอ Matrix Report: อุปกรณ์ (แกน Y) x โครงการ (แกน X)
- [X] T-016: แจ้งเตือน Alert อัตโนมัติเมื่อ Stock ไม่พอ (Stock < Demand)
- [X] T-017: เพิ่มฟังก์ชัน Export ใน Matrix Report
- [X] T-018: เพิ่มการกรองข้อมูลตามรอบการวางแผน (Cycle) และรายเดือน (Month) ในหน้า Store Center Dashboard (session_054)
    - [X] T-018.1: เพิ่ม cycle_id ในตาราง project_inventory
    - [X] T-018.2: แก้ไข API upload ให้รองรับ cycle_id
    - [X] T-018.3: ปรับปรุง API requests ให้ใช้ inventory ตามรอบ cycle เพื่อ Calibrate ยอดตั้งต้น
    - [X] T-018.4: เพิ่ม Cycle Selector ในหน้าจอ Import ยอดคงเหลือ (Master Data)
    - [X] T-018.5: ปรับปรุง UI Master Data ให้เลือก Cycle และแสดงผลยอด Calibrate
    - [X] T-018.6: ปรับปรุง API Requests ให้ใช้ยอด Warehouse Calibrate
    - [X] T-060: Create System Presentation and Screenshot Guide (Content & Screenshot List) · session_059
    - [X] T-061: Create Detailed Role-Based User Manuals (Admin, PM, Site, Center) · session_059
    - [X] T-062: Integrate Manuals and Presentation into Login Page · session_059
    - [X] T-018.7: ปรับปรุง Default View ให้แสดงข้อมูลจาก Cycle ล่าสุด
    - [X] T-018.8: เพิ่มฟังก์ชัน Export ข้อมูลเป็น Excel (ทั้ง Demand และ Return)
    - [X] T-018.9: ปรับปรุง Export เป็นแบบเลือกได้ (Filtered/All) และเพิ่มรายละเอียด Action/Status (session_061)
- [X] T-018-001-01: แก้ไขประกาศชื่อตัวแปร searchParams ซ้ำซ้อนใน API (session_054) (→ ERR-017)
- [X] T-018-002: แก้ไข SyntaxError: JSON.parse เนื่องจากการเรียก API ผิด (session_054) (→ ERR-018)
- [X] T-018-003: แก้ไขบั๊กยอดสต็อกแสดงเป็น 0 และแยกคอลัมน์ คลัง/หน้างาน/รวม (session_054)
- [X] T-048: แยกมุมมอง Site (Plan) และ Warehouse (Inventory) ใน Matrix Report (session_048)
- [X] T-050: ปรับปรุง UX/UI และความกว้างของ Matrix Report (session_050, session_051)
- [X] T-052: กรองข้อมูลสรุป Matrix เฉพาะจาก Approved Plan (session_052)
- [X] T-015-001-01: แก้ไข Tooltip คอลัมน์ ค้างรับ/ค้างส่ง ไม่แสดงผลเมื่อยอดเป็น 0 (-> ERR-014) (session_053)
- [X] T-015-001-02: แก้ไขการคำนวณยอดค้างใน Tooltip ผิดพลาด (Double Counting) (-> ERR-015) (session_053)
- [X] T-015.1: เพิ่มปุ่ม Export (All Matrix และ Procurement Plan) ใน Matrix Report
- [X] T-015.2: เพิ่มคอลัมน์ Running Number (#) ใน Matrix Report (session_055) · attempts: 1 · tool_calls: 5
- [X] T-015-001-03: แก้ไขการจัดวางหัวตาราง (Sticky Header) ใน Matrix Report เละ (→ ERR-026) · attempts: 4 · tool_calls: 28
- [X] T-019: แยกคอมโพเนนต์ Equipment Table (Internal Scroll + Sticky Header)
  - [X] T-019.1: เพิ่มคอลัมน์ Running Number (#) ในตารางเพื่อการอ้างอิง
  - [X] T-019-ERR: Document procedural error for missing session initialization (→ ERR-019)
- [X] T-055: ปรับปรุงโครงสร้าง UI Header ใน Equipment Master Data
  - [X] T-055.1: แยกกลุ่มปุ่มควบคุม Catalog, Stock, และ View Selection
  - [X] T-055.2: เพิ่มฟังก์ชันดาวน์โหลด Template สำหรับ Remaining Stock
  - [X] T-055.4: ปรับปรุง UI เป็นแบบ Dropdown Menus (แนวดิ่ง) (→ ERR-037) · attempts: 1 · tool_calls: 3
  - [X] T-055.5: ปรับแต่ง Layout ส่วน View & Search ใหม่ · attempts: 1 · tool_calls: 8
- [X] T-011-001-01: แก้ไขบั๊ก Reject Return ไม่ขยายผล (Propagate) ไปยังเดือนถัดไป (→ ERR-021) · attempts: 1 · tool_calls: 15
- [X] T-061: เพิ่มขั้นตอนการเข้าสู่ใบงานในคู่มือ Store Site (→ Manual updated)
- [X] T-061.1: เพิ่มรูปภาพในคู่มือ Store Site [X] T-061.1: เพิ่มรูปภาพในขั้นตอนที่ 1 ของคู่มือ Store Site (→ Manual updated) Reports (→ Manuals updated)
- [X] T-076: สร้าง Blur Loading Component (Blur Screen + Loading Spinner) และเชื่อมต่อการโหลดข้อมูลรอบ Cycle และตำแหน่งสำคัญ (→ session_076) · attempts: 1 · tool_calls: 12
- [X] T-083: Implement/ docs sync (all 8 files incl. 08_checklist.md) — reflect T-078–T-082 token efficiency in all 8 Implement/ files (B2/B3, hybrid gather, Delegation Contract, MECE caps, L4.5 PURGE, on_demand_files, manifest v2.1) · attempts: 1 · tool_calls: 12
- [X] T-082: Token efficiency — L4.5 PURGE step, R4 section slim, CFP archive gate >20 entries · attempts: 1 · tool_calls: 5
- [X] T-081: Hybrid gather loop — G1 front-loaded scan all sections, G2 batch greps, single user ask · attempts: 1 · tool_calls: 4
- [X] T-080: Fix boot context bloat — B3 on-demand only, Never-Full-Load rule (index JSON/roadmap/INVARIANTS), skill-manifest v2.1 (on_demand_files + when + how) · attempts: 1 · tool_calls: 6
- [X] T-079: Fix token leak — boot B2 skip, G2 post-read verdict, M1 partial load, conditional SKILL.md reload, mece plan size cap, session_handoff latest_result cap · attempts: 1 · tool_calls: 10
- [X] T-078: Fix token leak in sub-agent spawn — Delegation Contract, cycle_context cap, History limits, Resume Context Gate · attempts: 1 · tool_calls: 12
- [X] T-077: กู้คืนระบบ Category Preview และ Export ข้อมูลเป็น Excel · attempts: 1 · tool_calls: 3
  - [X] T-077.1: Diagnose (ตรวจสอบจุดแทรกโค้ดและไลบรารีของระบบจัดหมวดหมู่หลัก/ย่อย) · attempts: 1 · tool_calls: 1
  - [X] T-077.2: Edit & Verify (เขียนโค้ดฟีเจอร์ Preview Modal, Excel Export, และ Alphabet Suggestions) · attempts: 1 · tool_calls: 1
  - [X] T-077.3: Sync & Close (รีเฟรช Index, อัปเดตสถานะบอร์ดแผนงาน และสรุปผล) · attempts: 1 · tool_calls: 1
  - [X] T-077-001-01: แก้ไขบั๊กบันทึกหมวดหมู่/หมวดหมู่ย่อยใน D1 ไม่ได้จริง และเชื่อมต่อการสลับหน้า Tab เมื่อกดเพิ่มหมวดหมู่ใน Modal · attempts: 1 · tool_calls: 5
  - [X] T-077-002-01: นำเข้า Catalog (CSV) คืนค่าภาษาไทยโดยใช้ Lookup Dictionary mapping (→ ERR-032) · attempts: 1 · tool_calls: 14
  - [X] T-077-003-01: แก้ไขปุ่มอัปโหลด Catalog (CSV) ไม่ทำงานโดยการเพิ่ม input file tag ที่ขาดหายไป (→ ERR-033) · attempts: 1 · tool_calls: 11
  - [X] T-077-003-02: แก้ไขปุ่มอัปโหลด Catalog (CSV) ไม่ทำงานเนื่องจากถูกปิดกั้นการแสดงผลเมื่อ Modal ปิดอยู่ (→ ERR-034) · attempts: 1 · tool_calls: 38
  - [X] T-077-004-02: สร้างหน้าต่างเปรียบเทียบข้อมูลที่แตกต่างจากการอัปโหลด และถามผู้ใช้ว่าจะเขียนทับ (Overwrite) หรือข้าม (Skip) (→ ERR-036) · attempts: 1 · tool_calls: 5
  - [X] T-077-005-01: แก้ไขปุ่มเขียนทับข้อมูลทั้งหมด (Overwrite) ใน CSV Import Modal (เพิ่ม loading UI ป้องกัน double-submit และแก้ไข caching ของ Next.js fetch) (→ ERR-038) · attempts: 1 · tool_calls: 1
  - [X] T-077-006-01: แก้ไขปัญหาส่วนของ Index ตัวแปรระหว่าง Template กับตัว DataBase Schema ของ D1 (→ ERR-039) · attempts: 1 · tool_calls: 15
  - [X] T-077-006-02: แก้ไขปัญหาข้อมูลคอลัมน์เลื่อน (Column Shifting) ใน Modal แก้ไขอุปกรณ์อันเนื่องมาจากการดึงข้อมูลของ RemoteD1Database proxy (→ ERR-040) · attempts: 1 · tool_calls: 12
  - [X] T-077-007-01: สร้างหน้าต่าง Popup สำหรับเพิ่มหมวดหมู่หลัก (Main Category) และหมวดย่อย (Sub Category) พร้อมระบบแนะนำรหัสอัตโนมัติ (→ ERR-041) · attempts: 1 · tool_calls: 12
  - [X] T-077-008-01: ระบบลบหมวดหมู่โดยการ Archive และการลบรายการอุปกรณ์แบบมีเงื่อนไข (→ ERR-042) · attempts: 1 · tool_calls: 18
- [X] T-084: สร้าง Component การ์ดมาตรฐาน (Standard Card Component) และปรับปรุงหน้างวดงาน (Job Card) และการ์ดอื่น ๆ ให้สอดคล้องกัน · attempts: 1 · tool_calls: 18
  - [X] T-084.1: Scope & Index · attempts: 1 · tool_calls: 3
  - [X] T-084.2: Build · attempts: 1 · tool_calls: 12
  - [X] T-084.3: Sync & Close · attempts: 1 · tool_calls: 3





---
### 🐛 Bug & Error Task Format Reference
> **Format:** `{TaskID}-{BugID}-{AttemptID}`
> **Example:** `T-004-001-02` (แก้บักตัวที่ 1 ของงาน T-004 รอบที่ 2)
> **Status:** `[ ]` (ยังไม่เริ่ม) -> `[/]` (กำลังทำ/รอตรวจ) -> `[X]` (เสร็จ/ตรวจผ่าน)
