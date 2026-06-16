# Visual User Guide — Asset Plan

คู่มือฉบับนี้อัปเดตจากระบบจริงใน repo ปัจจุบัน เพื่อแทนที่คู่มือภาพเดิมที่ล้าสมัยและมีข้อมูลไม่ครบ

- อัปเดตล่าสุด: 2026-06-11
- อ้างอิงโค้ดหลัก: `src/app/*`, `src/components/*`, `USER_GUIDE.md`
- หมายเหตุ: ไม่ใส่ test credential ลงในเอกสารแล้ว ให้ใช้บัญชีทดสอบจากทีมแทน
- ชุดภาพอ้างอิงหลัก: `public/docs/manual/assets/` (ถ้ามี) และ fallback คือ `public/manual-images/`

---

## สารบัญ

1. [ภาพรวมระบบและสิทธิ์](#1-ภาพรวมระบบและสิทธิ์)
2. [การเข้าสู่ระบบและเมนูหลัก](#2-การเข้าสู่ระบบและเมนูหลัก)
3. [Store Site: การกรอกแผน](#3-store-site-การกรอกแผน)
4. [PM Approval: การตรวจและอนุมัติ](#4-pm-approval-การตรวจและอนุมัติ)
5. [Store Center: การจัดการรอบแผน](#5-store-center-การจัดการรอบแผน)
6. [Store Center: ความต้องการสุทธิและ Decision](#6-store-center-ความต้องการสุทธิและ-decision)
7. [Matrix Report](#7-matrix-report)
8. [Master Data](#8-master-data)
9. [Admin](#9-admin)
10. [Profile และการเปลี่ยนรหัสผ่าน](#10-profile-และการเปลี่ยนรหัสผ่าน)
11. [End-to-End Flow](#11-end-to-end-flow)
12. [รายการภาพประกอบที่มีอยู่](#12-รายการภาพประกอบที่มีอยู่)

---

## 1. ภาพรวมระบบและสิทธิ์

Asset Plan ใช้สำหรับวางแผนความต้องการอุปกรณ์ของไซต์งาน, ตรวจอนุมัติโดย PM, และจัดสรรจากคลังกลางจนถึงการรับคืน

### บทบาทผู้ใช้

| Role | หน้าที่หลัก | หน้าใช้งานหลัก |
|---|---|---|
| `STORE_SITE` | กรอกและส่งแผนรายเดือนของไซต์ | `/site-plan` |
| `PROJECT_MANAGER` | ตรวจ, แก้ไข, อนุมัติ, ตีกลับ | `/site-plan/pm-approval` |
| `VIEWER` | ดูข้อมูลแบบอ่านอย่างเดียว | `/site-plan` |
| `STORE_CENTER` | สร้างรอบแผน, จัดสรร, รับคืน, export | `/store-center`, `/matrix-report`, `/master-data` |
| `ADMIN` | จัดการผู้ใช้, โครงการ, สิทธิ์, และเข้าถึงทุกหน้า | `/admin/*` |

### หลักการสิทธิ์

- ผู้ใช้ 1 คนมี `global_role` ได้ 1 ค่า
- ผู้ใช้คนเดียวกันมี `project role` ได้หลายโครงการ
- PM และ Site อิงสิทธิ์ระดับโครงการ
- Viewer เห็นข้อมูลได้ แต่ปุ่มแก้ไขจะถูกซ่อนหรือใช้งานไม่ได้

---

## 2. การเข้าสู่ระบบและเมนูหลัก

### 2.1 หน้า Login

ผู้ใช้เริ่มที่ `/login` เพื่อกรอก Email และ Password

![หน้าเข้าสู่ระบบ](../../public/docs/manual/assets/login.png)

### 2.2 หน้า Home / Portal

หลังเข้าสู่ระบบสำเร็จ ระบบจะแสดง card เมนูตามสิทธิ์ เช่น Projects, Master Data, Store Site, Project Approval, Store Center และ Matrix Report

![หน้าหลักหลังเข้าสู่ระบบ](../../public/manual-images/dashboard-home.png)

ภาพเมนูผู้ใช้ใน navbar:

![เมนูผู้ใช้ใน Navbar](../../public/docs/manual/assets/navbar_dropdown.png)

### 2.3 Navbar และเมนูตามสิทธิ์

- กลุ่ม `STORE_CENTER` และ `ADMIN` เห็น `Projects`, `Master Data`, `Store Center`
- กลุ่มที่มี project role หรือ `USER` เห็น `Store Site`
- กลุ่มที่มี `PROJECT_MANAGER` เห็น `Approval`
- `ADMIN` และ `STORE_CENTER` เห็น `Matrix`
- ทุก role ที่ login แล้วเข้า `/profile` เพื่อเปลี่ยนรหัสผ่านได้

---

## 3. Store Site: การกรอกแผน

### 3.1 หน้า Dashboard `/site-plan`

หน้าหลักของ Site แสดง Planning Job ตามโครงการที่ผู้ใช้เข้าถึง

- กรองตามโครงการได้
- ดูสถานะ `OPEN`, `SUBMITTED`, `APPROVED`, `CLOSED`
- มี badge นับถอยหลัง deadline
- ถ้าเลยกำหนดหรือถูก approve แล้วจะเข้าสู่โหมดล็อก
- ถ้าคลังกลางปลดล็อกชั่วคราว จะมี badge `ปลดล็อคชั่วคราว`

![หน้า Store Site Dashboard](../../public/docs/manual/assets/site_dashboard.png)

### 3.2 การเปิดใบงาน

- ถ้าใบงานยังแก้ไขได้ ปุ่มแสดง `เริ่มวางแผน`
- ถ้าใบงานถูกล็อก ปุ่มแสดง `ดูรายละเอียด`

### 3.3 หน้า Worksheet `/site-plan/[job_id]`

ตารางกรอกแผนประกอบด้วย:

- รหัสอุปกรณ์
- ชื่ออุปกรณ์
- หน่วย
- ยอดคลังกลาง
- ยอดมีอยู่ของไซต์
- เดือนเป้าหมายแต่ละเดือน

![หน้า Worksheet ก่อนกรอก](../../public/docs/manual/assets/site_worksheet.png)

### 3.4 วิธีกรอกข้อมูล

1. ค้นหาด้วยรหัสหรือชื่ออุปกรณ์
2. เรียงลำดับด้วยการคลิกหัวตาราง
3. กรอกจำนวนรายเดือน
4. กด `Enter` เพื่อเลื่อนไปแถวถัดไป
5. เมื่อกด `Enter` หรือออกจากช่อง ระบบจะ auto-fill เดือนถัดไปที่ยังว่าง
6. ถ้าเดือนแรกว่าง ระบบใช้ค่าเดือนก่อนหน้าเป็นตัวช่วยอ้างอิง

### 3.5 ความหมายของตัวช่วยในตาราง

- ตัวเลขจางในเดือนแรก คือค่าอ้างอิงจากรอบก่อน
- ถ้ายอดเดือนถัดไปต่ำกว่าเดือนก่อน จะมี badge `คืน X`
- ตารางรองรับ export และ import Excel

![ตัวอย่างการกรอกข้อมูลใน Worksheet](../../public/docs/manual/assets/site_worksheet_filling.png)

### 3.6 การบันทึก

- `บันทึกฉบับร่าง` จะคงสถานะงานไว้
- `ส่งแผน` เปลี่ยนสถานะจาก `OPEN` เป็น `SUBMITTED`
- หลังส่งแผน ตารางจะถูกล็อกจนกว่า PM จะตีกลับ หรือคลังกลางจะ unlock

![Modal บันทึกฉบับร่าง](../../public/docs/manual/assets/site_save_draft_modal.png)

![Modal ส่งแผน](../../public/docs/manual/assets/site_submit_modal.png)

---

## 4. PM Approval: การตรวจและอนุมัติ

### 4.1 หน้า Hub `/site-plan/pm-approval`

PM เห็น 2 แท็บหลัก:

- `รออนุมัติ` สำหรับงานสถานะ `SUBMITTED`
- `ประวัติการอนุมัติ` สำหรับ `APPROVED`, `REJECTED`, `CLOSED`

![หน้า PM Approval Hub](../../public/docs/manual/assets/pm_review.png)

### 4.2 หน้า Review รายใบงาน `/site-plan/pm-approval/[id]`

ส่วนหัวจะแสดง:

- ชื่อโครงการ
- รหัสโครงการ
- เลขรอบแผน
- เลข job
- สถานะล่าสุด

### 4.3 การใช้งานตาราง Review

- กรองได้ตาม `ALL`, `DEMAND`, `RETURN`, `CHANGED`
- PM แก้ตัวเลขได้โดยตรงเมื่อ job ยังเป็น `SUBMITTED`
- กด `บันทึกการแก้ไข` เพื่อเก็บ change log
- ด้านบนมีสรุปยอดสั่งเพิ่มรวมและยอดคืนของรวม

ภาพแท็บประวัติ:

![แท็บประวัติการอนุมัติ](../../public/docs/manual/assets/pm_history_tab.png)

### 4.4 การตัดสินใจ

- `อนุมัติ` เปลี่ยน job เป็น `APPROVED`
- `ตีกลับ` ต้องกรอกเหตุผล และ job จะกลับเป็น `OPEN`
- ถ้า job ไม่ใช่ `SUBMITTED` หน้า review จะกลายเป็น read-only

![Modal อนุมัติ](../../public/docs/manual/assets/pm_approve_modal.png)

![Modal ตีกลับ](../../public/docs/manual/assets/pm_reject_modal.png)

### 4.5 ขอแก้ไขหลังอนุมัติ

ฝั่ง Store Center มี flow `revert approval` เพื่อดึง job ที่ approved แล้วกลับเป็น `SUBMITTED` เมื่อมีคำขอแก้ไข

---

## 5. Store Center: การจัดการรอบแผน

หน้า `/store-center` มี 2 แท็บ:

- `จัดการใบงาน (Planning Jobs)`
- `ความต้องการสุทธิ (Net Demand & Decisions)`

![หน้า Store Center - Jobs Tab](../../public/docs/manual/assets/store_center_jobs.png)

### 5.1 สร้างรอบแผนใหม่

1. กด `สร้างงวดงานใหม่`
2. กรอก `วันเริ่มต้น` และ `วันสิ้นสุด`
3. เลือก `เดือนเป้าหมาย`
4. เลือกโครงการที่จะเข้าร่วม
5. กดบันทึกเพื่อให้ระบบสร้าง job ให้ทุกโครงการ

Validation:

- ไม่เลือกเดือน จะไม่ให้สร้าง
- ไม่เลือกโครงการ จะไม่ให้สร้าง

### 5.2 แก้ไขรอบแผน

- เพิ่มโครงการใหม่เข้า cycle ได้
- เอาโครงการออกได้เฉพาะ job ที่ยังไม่ `APPROVED`
- โครงการ archived ที่อยู่ใน cycle เดิมยังมองเห็นได้ตอนแก้ไข

### 5.3 ลบรอบแผน

- ลบ cycle ได้ถ้ายังไม่มี job ใด `APPROVED`
- ถ้ามี approved แล้ว ระบบจะกันการลบ

### 5.4 Lock / Unlock ใบงาน

คลังกลางสามารถ:

- `Unlock` เพื่อให้ไซต์กลับไปแก้และส่งใหม่
- `Lock คืน` เพื่อปิดการแก้ไขอีกครั้ง

ภาพ modal ที่เกี่ยวข้องกับรอบแผน:

![Modal สร้างรอบแผน](../../public/docs/manual/assets/admin_cycle_modal.png)

![Modal แก้ไขรอบแผน](../../public/docs/manual/assets/admin_edit_cycle_modal.png)

### 5.5 การ์ดงานและสีสถานะ

- สีแดง: เลยกำหนด
- สีเหลือง: ใกล้ deadline
- สีน้ำเงิน: ปกติ

---

## 6. Store Center: ความต้องการสุทธิและ Decision

### 6.1 หน้าความต้องการสุทธิ

หน้าจอนี้ใช้จัดการ net demand หลังหัก inventory หน้างานแล้ว

- filter ตาม cycle, month, status, search
- load แบบ infinite scroll
- sort ได้ตามโครงการ, รายการ, เดือน, จำนวน, สต็อก
- แยกมุมมอง `DEMAND` และ `RETURN`

![หน้า Net Demand](../../public/docs/manual/assets/center_net_demand.png)

### 6.2 แถบสรุปด้านบน

- `High Urgency`
- `Total Net Requests`
- ปุ่ม `Export ข้อมูล`
- alert สต็อกไม่พอจะแสดงด้านบนเป็นแถบสีแดง

![เมนู Export ของ Store Center](../../public/docs/manual/assets/center_export.png)

### 6.3 ฝั่ง DEMAND

รองรับ 5 วิธีจัดสรร:

1. `DISPATCH`
2. `CIRCULATE`
3. `SUBSTITUTE`
4. `BUY`
5. `RENT`

กติกาสำคัญ:

- `DISPATCH` ใช้ได้เมื่อ stock พอ
- `CIRCULATE` และ `SUBSTITUTE` ต้องใส่ notes
- modal จะกรอกจำนวนคงเหลือที่ยังไม่ fulfilled ให้อัตโนมัติ

### 6.4 Bulk Dispatch

1. ติ๊ก checkbox หลายรายการ
2. กด `เบิกจ่ายรวม`
3. ระบบจะประมวลผลเฉพาะรายการที่ stock พอ
4. หลังเสร็จต้องตรวจ `fulfilled_qty` ซ้ำ เพราะรายการ stock ไม่พอจะถูกข้าม

### 6.5 ฝั่ง RETURN

รองรับ 2 action:

- `RECEIVE` รับของคืนเข้าคลัง
- `REJECT_RETURN` ปฏิเสธการรับคืน

![หน้า Return Tab](../../public/docs/manual/assets/center_net_demand_return.png)

![Modal รับคืน](../../public/docs/manual/assets/center_receive_modal.png)

![Modal ปฏิเสธการรับคืน](../../public/docs/manual/assets/center_reject_return_modal.png)

### 6.6 ประวัติ Decision

ใบงานที่จัดการแล้วสามารถเปิด history modal เพื่อ:

- ดูรายการ decision ทั้งหมด
- แก้ไข decision เดิม
- เลือกหลายรายการเพื่อลบพร้อมกัน
- ลบแล้วระบบ reverse stock ให้ตามประเภท action

![Modal ประวัติ Decision](../../public/docs/manual/assets/center_history_modal.png)

### 6.7 Export Excel

มี 2 รูปแบบ:

- `ส่งออกตามที่กรองไว้`
- `ส่งออกทั้งหมด`

ไฟล์ export แยกเป็น 2 sheet:

- `New Demand`
- `Expected Returns`

---

## 7. Matrix Report

หน้า `/matrix-report` ใช้ดูภาพรวมข้ามทุกโครงการ

- แถวคือรายการอุปกรณ์
- คอลัมน์ฝั่งไซต์คือแผนหรือยอด peak
- คอลัมน์ฝั่งคลังคือ stock
- มีคอลัมน์สรุป demand, fulfilled, pending, expected returns
- filter ตาม cycle, เดือน, archive, และเฉพาะรายการที่ยังต้องดำเนินการ
- export ได้ทั้ง matrix เต็ม และ procurement list

![หน้า Matrix Report](../../public/docs/manual/assets/matrix_report.png)

![เมนู Export ของ Matrix Report](../../public/docs/manual/assets/report_export.png)

---

## 8. Master Data

หน้า `/master-data` ใช้จัดการข้อมูลอุปกรณ์และ stock กลาง

สิ่งที่ทำได้:

- ดูรายการอุปกรณ์ทั้งหมด
- เพิ่ม, แก้ไข, ลบรายการ
- ดาวน์โหลด template สำหรับ import
- import ข้อมูลแบบ bulk
- จัดการหมวดหมู่
- จัดการ remaining stock

ผลกระทบ:

- การแก้ `remaining_stock` กระทบยอดที่ทั้งระบบใช้ทันที

![หน้า Master Data](../../public/docs/manual/assets/master_data.png)

ภาพเสริมใน Master Data:

![แท็บหมวดหมู่](../../public/docs/manual/assets/master_data_categories.png)

![Preview หมวดหมู่](../../public/docs/manual/assets/master_data_category_preview.png)

![เมนูจัดการรายการสินค้า](../../public/docs/manual/assets/master_data_catalog_menu.png)

![Modal เพิ่มรายการสินค้า](../../public/docs/manual/assets/master_data_preview_modal.png)

![เมนูจัดการ Remaining Stock](../../public/docs/manual/assets/master_data_stock_menu.png)

![Modal อัปโหลดยอดคงเหลือ](../../public/docs/manual/assets/master_data_upload_modal.png)

---

## 9. Admin

### 9.1 Users `/admin/users`

ทำได้ดังนี้:

- เพิ่มผู้ใช้ใหม่
- แก้ Email
- เปลี่ยน Password
- เปลี่ยน `global_role`
- ลบผู้ใช้แบบถาวร

![หน้า User Management](../../public/docs/manual/assets/admin_users.png)

![Modal เพิ่มผู้ใช้](../../public/docs/manual/assets/admin_add_user_modal.png)

![Modal แก้ไขผู้ใช้](../../public/docs/manual/assets/admin_edit_user_modal.png)

### 9.2 Projects `/admin/projects`

ทำได้ดังนี้:

- สร้างโครงการใหม่
- กำหนดประเภท `SITE` หรือ `WAREHOUSE`
- แก้ชื่อและสถานะ
- archive โครงการ
- ดูรายการ asset ที่ไซต์ถืออยู่

![หน้า Project Management พร้อมปุ่มเพิ่มโครงการ](../../public/docs/manual/assets/admin_projects_header.png)

![รายการโครงการ](../../public/docs/manual/assets/admin_projects.png)

![ตัวกรองเฉพาะ Site](../../public/docs/manual/assets/admin_projects_site_filter.png)

![มุมมอง Archived Projects](../../public/docs/manual/assets/admin_projects_archived.png)

![Modal เพิ่มโครงการ](../../public/docs/manual/assets/admin_add_project_modal.png)

![Modal แก้ไขโครงการ](../../public/docs/manual/assets/admin_edit_project_modal.png)

### 9.3 Project Roles `/admin/project-roles`

flow การกำหนดสิทธิ์:

1. เลือกผู้ใช้
2. ค้นหาและเลือกโครงการได้หลายรายการ
3. เลือก role: `STORE_SITE`, `PROJECT_MANAGER`, `VIEWER`
4. กด `Confirm Assignment`

สิ่งสำคัญ:

- ปุ่ม `Select All` และ `Clear` ทำงานกับผล search ปัจจุบัน
- ตาราง assignment จัดกลุ่มตาม `user + role`
- การลบ 1 แถว คือการลบทั้งกลุ่มของโครงการใน role นั้น

![หน้า Project Roles](../../public/docs/manual/assets/admin_project_roles.png)

---

## 10. Profile และการเปลี่ยนรหัสผ่าน

หน้า `/profile` ใช้เปลี่ยนรหัสผ่านของผู้ใช้ที่ login อยู่

ขั้นตอน:

1. เปิดหน้า Profile
2. กรอกรหัสผ่านใหม่
3. กรอกยืนยันรหัสผ่าน
4. กด `Update Password`

Validation:

- รหัสผ่านต้องยาวอย่างน้อย 6 ตัว
- รหัสผ่านและยืนยันรหัสผ่านต้องตรงกัน

---

## 11. End-to-End Flow

```text
STORE_CENTER
  -> สร้างรอบแผน
  -> เลือกโครงการและเดือนเป้าหมาย

STORE_SITE
  -> เปิด job
  -> กรอกแผนรายเดือน
  -> Save Draft หรือ Submit

PROJECT_MANAGER
  -> ตรวจแผน
  -> แก้ไขถ้าจำเป็น
  -> Approve หรือ Reject

STORE_CENTER
  -> ดู Net Demand
  -> ตัดสินใจ Dispatch / Circulate / Substitute / Buy / Rent
  -> รับคืนหรือปฏิเสธของคืน

REPORTING
  -> ตรวจ Matrix Report
  -> Export รายงานและ procurement list
```

### สถานะหลัก

- Job: `OPEN -> SUBMITTED -> APPROVED -> CLOSED`
- กรณีตีกลับ: `SUBMITTED -> OPEN`
- กรณี unlock เพื่อแก้ใหม่: `APPROVED -> แก้ไข -> SUBMITTED`

---

## 12. รายการภาพประกอบที่มีอยู่

ภาพที่มีใน repo ตอนนี้:

- `public/docs/manual/assets/login.png`
- `public/docs/manual/assets/navbar_dropdown.png`
- `public/docs/manual/assets/profile.png`
- `public/docs/manual/assets/admin_users.png`
- `public/docs/manual/assets/admin_add_user_modal.png`
- `public/docs/manual/assets/admin_edit_user_modal.png`
- `public/docs/manual/assets/admin_projects.png`
- `public/docs/manual/assets/admin_projects_header.png`
- `public/docs/manual/assets/admin_projects_site_filter.png`
- `public/docs/manual/assets/admin_projects_archived.png`
- `public/docs/manual/assets/admin_add_project_modal.png`
- `public/docs/manual/assets/admin_edit_project_modal.png`
- `public/docs/manual/assets/admin_project_roles.png`
- `public/docs/manual/assets/master_data.png`
- `public/docs/manual/assets/master_data_categories.png`
- `public/docs/manual/assets/master_data_category_preview.png`
- `public/docs/manual/assets/master_data_catalog_menu.png`
- `public/docs/manual/assets/master_data_preview_modal.png`
- `public/docs/manual/assets/master_data_stock_menu.png`
- `public/docs/manual/assets/master_data_upload_modal.png`
- `public/docs/manual/assets/site_dashboard.png`
- `public/docs/manual/assets/site_worksheet.png`
- `public/docs/manual/assets/site_worksheet_filling.png`
- `public/docs/manual/assets/site_save_draft_modal.png`
- `public/docs/manual/assets/site_submit_modal.png`
- `public/docs/manual/assets/pm_review.png`
- `public/docs/manual/assets/pm_history_tab.png`
- `public/docs/manual/assets/pm_approve_modal.png`
- `public/docs/manual/assets/pm_reject_modal.png`
- `public/docs/manual/assets/store_center_jobs.png`
- `public/docs/manual/assets/admin_cycle_modal.png`
- `public/docs/manual/assets/admin_edit_cycle_modal.png`
- `public/docs/manual/assets/center_net_demand.png`
- `public/docs/manual/assets/center_net_demand_return.png`
- `public/docs/manual/assets/center_export.png`
- `public/docs/manual/assets/center_history_modal.png`
- `public/docs/manual/assets/center_receive_modal.png`
- `public/docs/manual/assets/center_reject_return_modal.png`
- `public/docs/manual/assets/matrix_report.png`
- `public/docs/manual/assets/report_export.png`
- fallback ชุดเดิมใน `public/manual-images/*`

ถ้าต้องการอัปเดตภาพหน้าจอตาม UI ปัจจุบัน ให้ใช้:

- `scripts/take_screenshots.py` สำหรับชุดภาพใหม่
- `public/docs/manual/assets/` เป็น output หลักของภาพชุดใหม่
