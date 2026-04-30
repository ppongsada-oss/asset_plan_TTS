# Master Project Roadmap: Asset Plan

> **📌 CURRENT ACTIVE FOCUS:** Phase 1 - Project Initialization & Architecture Setup
> **📊 OVERALL PROGRESS:** 0%

---

## 🖥️ Page 0: Project Foundation (System Level)
**Goal:** วางระบบโครงสร้างพื้นฐาน

### Feature 0.1: Core Agent Workflow
- [X] T-000: วางโครงสร้างโฟลเดอร์ไฟล์, สถาปัตยกรรม .agents และระบบ Index JSON

### Feature 0.2: Web Application Framework Setup
- [X] T-001: สร้าง Frontend App
- [X] T-002: สร้าง Backend App / API & Database Connection
- [ ] T-003: ตั้งค่า Authentication Framework

---

## 🖥️ Page 1: Login & Security (User Management)
**Goal:** ระบบเข้าสู่ระบบและจัดการสิทธิ์อ้างอิงจาก Sheet สารบัญ

### Feature 1.1: Authentication UI & State
- [X] T-004: สร้างหน้า Login UI (Priority: UI-First)
- [ ] T-005: ต่อ API Login & จัดการ JWT Token

### Feature 1.2: Security Control
- [ ] T-006: สร้างระบบปกป้องสิทธิ์ราย Project (Password/Role)

---

## 🖥️ Page 2: Master Data Management
**Goal:** หน้าจอสำหรับตั้งค่าอุปกรณ์และโครงการ ข้อมูลพื้นฐานจาก Excel Sheet: ประวัติการซื้อและเช่า, รวบรายการ

### Feature 2.1: Equipment Catalog
- [X] T-007: สร้าง UI สำหรับจัดการรายการอุปกรณ์ 21 หมวดย่อย
- [X] T-008: สร้าง Database Schema `equipment_items` และ API CRUD

### Feature 2.2: Data Initialization & Import
- [X] T-009: สร้างฟังก์ชัน Import/Migration ข้อมูลจาก Excel เข้า DB

---

## 🖥️ Page 3: Warehouse & Inventory Management (Store Center)
**Goal:** ฝั่งคลังสินค้ากลางรับแผนจากไซด์เพื่อจัดหา หมุนเวียน และสรุป Buy/Rent

### Feature 3.1: Center Workflows & Dashboard
- [X] T-010: สร้างหน้า Dashboard สรุปคำขอจากทุก Site
- [ ] T-011: สร้างระบบจัดการหมุนเวียน (Circulation) และสลับสเปก (Substitute)
- [ ] T-012: สร้างปุ่มบันทึกมติจัดหา (Rent vs Buy Decision) ต่อ 1 คำขอ

---

## 🖥️ Page 4: Project Asset Planning (Site)
**Goal:** หน้าจอสำหรับ Site ในการวางแผนและขออนุมัติ

### Feature 4.1: Site Planning & Approval
- [X] T-013: สร้างหน้าจอให้ Store Site กรอก/ร่าง (Draft) แผนการใช้อุปกรณ์
- [X] T-014: สร้างหน้าจอให้ Project Manager (PM) กด Approve เพื่อส่งเข้า Center
- [ ] T-015: API บันทึก/อัปเดต สถานะ `Pending -> Approved -> Procured`

---

## 🖥️ Page 5: Cross-Project Reporting
**Goal:** หน้าจอ Reporting จาก Combine (2) และ Combine (3)

### Feature 5.1: Combine Summary & Matrix
- [ ] T-015: สร้างหน้าจอ Matrix Report: อุปกรณ์ (แกน Y) x โครงการ (แกน X)
- [ ] T-016: แจ้งเตือน Alert อัตโนมัติเมื่อ Stock ไม่พอ (Stock < Demand)

---
### 🐛 Bug & Error Task Format Reference
> **Format:** `{TaskID}-{BugID}-{AttemptID}`
> **Example:** `T-004-001-02` (แก้บักตัวที่ 1 ของงาน T-004 รอบที่ 2)
> **Status:** `[ ]` (ยังไม่เริ่ม) -> `[/]` (กำลังทำ/รอตรวจ) -> `[X]` (เสร็จ/ตรวจผ่าน)
