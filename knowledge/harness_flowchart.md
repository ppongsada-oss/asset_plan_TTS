# Agent Harness Workflow — แผนภาพการทำงาน (Flowcharts)

เอกสารฉบับนี้รวบรวมแผนภาพอธิบายขั้นตอนการทำงาน (Flowcharts) ของ Agent Harness ในระบบ **Asset Plan** ตั้งแต่เริ่มต้นจนสิ้นสุดเซสชัน โดยแสดงผลในรูปแบบ **Mermaid Diagram** เพื่อความง่ายต่อการสืบค้นและทำความเข้าใจ

---

## 1. ภาพรวมกระบวนการพัฒนา (End-to-End Lifecycle Overview)

แผนภาพรวมแสดงขั้นตอนทั้งหมดตั้งแต่ได้รับคำสั่งจาก User จนถึงปิดเซสชันสำเร็จ:

```mermaid
graph TD
    Start([User ส่งคำสั่งงาน]) --> Boot[Boot Sequence & Routing]
    Boot --> RoutingCheck{เป็นงานสลับหัวข้อ?}
    RoutingCheck -- ใช่ --> Reroute[สลับ Skill & รีโหลด SKILL.md] --> InfoGather
    RoutingCheck -- ไม่ใช่ --> InfoGather
    
    subgraph Loops [Loop Architecture]
        InfoGather[Phase 1: Info Gather Loop] --> ContextCheck{Context เพียงพอ? <br> checklist 3 ข้อ}
        ContextCheck -- ไม่พอ / Stall --> WaitUser[หยุดรอขอข้อมูลเพิ่มเติมจาก User]
        WaitUser --> InfoGather
        
        ContextCheck -- เพียงพอ --> MECEPlan[Phase 2: MECE Plan]
        MECEPlan --> Approve{User อนุมัติแผน?}
        Approve -- ไม่ผ่าน --> MECEPlan
        Approve -- ผ่าน --> Execution[Phase 3: Execution Loop <br> REACT Loop: L1-L5]
    end

    Execution --> CompletionCheck{ผ่านเกณฑ์ผ่านด่าน <br> Completion Gate 7 ข้อ?}
    CompletionCheck -- ไม่ผ่าน --> Execution
    CompletionCheck -- ผ่าน --> SessionClose[Session Close: <br> บันทึกไฟล์บังคับ 4 ไฟล์]
    SessionClose --> End([เสร็จสิ้นเซสชัน])
```

---

## 2. ขั้นตอนการบูตและการเลือกสกิล (Boot & Routing Decision)

แสดงลำดับการบูตในเทิร์นแรกและการส่งผ่านงานไปยังสกิลต่างๆ ในแต่ละรอบ (Turn):

```mermaid
graph TD
    Start([User Message]) --> B1{B1: เช็คสถานะเดิม}
    B1 -->|phase = done| ResetTokens[รีเซ็ต SESSION_TOTAL = 0] --> B2[B2: หาตัวจับคู่ใน skill-manifest.json]
    B1 -->|phase = in_progress| LoadTokens[โหลด SESSION_TOTAL เดิม] --> B2
    
    B2 --> B3[B3: โหลด SKILL.md เข้าความจำ]
    B3 --> B4{B4: ทราบ Platform?}
    B4 -->|ไม่ทราบ| Probe[รัน Probe หา OS & Tools] --> Reply1[พ่น Reply บรรทัดแรก Boot Trace]
    B4 -->|ทราบ| Reply1
    
    Reply1 --> ProcessTurn[ดำเนินงานประจำเทิร์น]
    ProcessTurn --> NextTurn([รอคำสั่งเทิร์นถัดไป])
    
    NextTurn --> C1[C1: แกะ Intent Keyword ล่าสุด]
    C1 --> C2[C2: ค้นหา Match ใน manifest]
    C2 --> C3{C3: ตรงกับ Skill เดิม?}
    C3 -->|ตรง| ProcessTurn
    C3 -->|ไม่ตรง| RerouteSkill[→ skill: โหลดไฟล์กติกาของ Skill ใหม่] --> ProcessTurn
```

---

## 3. สถาปัตยกรรมลูป 3 เฟส (3-Phase Loop Architecture)

ขั้นตอนละเอียดของ **Info Gather**, **MECE Plan** และ **REACT Execution Loop**:

```mermaid
graph TD
    subgraph Phase 1: Info Gather
        G1[G1: ตรวจสอบชิ้นส่วนที่ยังขาด] --> G2[G2: ดึงข้อมูล R5 Index-First]
        G2 --> G3{G3: ประเมิน context_sufficient}
        G3 -->|ไม่ผ่าน & Iteration < 3| G1
        G3 -->|ไม่ผ่าน & Iteration >= 3| Stall[gather-stalled: หยุดถามผู้ใช้]
    end
    
    G3 -->|ผ่าน| Plan[Phase 2: MECE Plan]
    
    subgraph Phase 2: MECE Plan
        Plan --> M1[M1-M2: สร้างแผนงานย่อย 1:1 กับ Skill]
        M1 --> M25[M2.5: กำหนดชุดคำสั่งรันเทสจริง Verify-N]
        M25 --> M3[M3: ส่งแผนให้ User อนุมัติ]
        M3 --> M4[M4-M5: เขียน mece_plan.md & อัปเดต Roadmap]
    end
    
    M4 --> Exec[Phase 3: Execution Loop]
    
    subgraph Phase 3: Execution Loop (L1-L5)
        Exec --> L1[L1: SELECT เครื่องมือที่เหมาะสม]
        L1 --> L2[L2: EXECUTE เขียน/แก้โค้ด / รันคำสั่ง]
        L2 --> L3[L3: OBSERVE ตรวจสอบเออร์เรอร์เบื้องต้น]
        L3 --> L4[L4: VERIFY เขียนไฟล์ Grep / รัน Verify-N]
        L4 --> L5{L5: DECIDE ผ่านครบถ้วน?}
        L5 -->|ไม่ผ่าน| Retry{ลองใหม่ครบ 2 ครั้ง?}
        Retry -->|ไม่ครบ| L1
        Retry -->|ครบ| Blocked[Blocked Halt: หยุดรอตรวจ]
        L5 -->|ผ่าน| NextSec{มี Section เหลือ?}
        NextSec -->|มี| Exec
        NextSec -->|ไม่มี| Done[พร้อมเข้าสู่ Completion Gate]
    end
```

---

## 4. การทำงานขนานและ Sub-Agent (Cycle Orchestration)

จำลองกระบวนการรันงานย่อยไปพร้อมกันด้วย Sub-Agent แบบขนาน:

```mermaid
graph TD
    Start[เริ่มรอบการทำงาน Cycle N] --> TokenCheck{โทเค็นสะสม > 60k?}
    TokenCheck -- ใช่ --> Pause[TOKEN PAUSE: เซฟสถานะหยุดรอ]
    TokenCheck -- ไม่ใช่ --> FanOut[ตรวจหางานที่ไม่มีการเกี่ยวเนื่องกัน]
    
    FanOut --> Spawn[สปอว์น Sub-Agents ทำงานขนาน]
    
    subgraph SubAgents [การทำงานของ Sub-Agents]
        Agent1[Sub-Agent 1: รันขอบเขตงาน S1] --> Out1[เขียนผลลัพธ์ลง JSON 1]
        Agent2[Sub-Agent 2: รันขอบเขตงาน S2] --> Out2[เขียนผลลัพธ์ลง JSON 2]
    end
    
    Out1 & Out2 --> Join[รอสัญลักษณ์เสร็จงานครบถ้วน]
    Join --> Validate{ตรวจสอบความถูกต้องของ JSON ผลลัพธ์}
    
    Validate -- พบจุดล้มเหลว --> Halt[HALT: ปรับสถานะเป็น Blocked]
    Validate -- ผ่านหมด --> Aggregate[รวบรวมตัวแปรส่งต่อข้าม Cycle]
    Aggregate --> CycleNext[เริ่มรัน Cycle N+1]
```

---

## 5. การจัดการสิทธิ์และการแก้ไขฐานข้อมูล (Gates & Error Protocols)

กระบวนการความปลอดภัยและการรับมือกับข้อผิดพลาด:

```mermaid
graph TD
    Start[ต้องการแก้ไขโค้ด/ระบบ] --> CheckType{ประเภทงาน?}
    
    CheckType -->|แก้ไขฐานข้อมูล / Drizzle ORM| DBGate[db-gate: แสดงผลกระทบต่อ DB]
    DBGate --> WaitDB[รอคำยืนยัน พิมพ์ yes เท่านั้น]
    WaitDB --> ExecuteChange[เขียนโค้ดแก้ไขจริง]
    
    CheckType -->|ลบไฟล์ / นอกแผน / เขียนทับ| Destructive[gate: ประเมินความเสียหาย]
    Destructive --> WaitConfirm[รอ User กดยืนยันเพื่อสิทธิ์]
    WaitConfirm --> ExecuteChange
    
    CheckType -->|แก้ไขบั๊ก / ดีบั๊กทั่วไป| ErrorProtocol[R9 Error Protocol]
    ErrorProtocol --> R9_1[1. ค้นหาใน error_index.md]
    R9_1 --> R9_2[2. ตรวจหา Symbol ใน index_variables.json]
    R9_2 --> R9_3[3. ตรวจ Backlinks ใน index_files.json]
    R9_3 --> R9_Pass[ผ่านด่านประเมินผลกระทบ ✓ R9]
    R9_Pass --> ExecuteChange
```

---

## 6. สรุปกระบวนการปิดเซสชัน (Session Close Flow)

ขั้นตอนหลังจากตรวจรับงานสำเร็จ และปิดแอปพลิเคชันอย่างเป็นระเบียบ:

```mermaid
graph TD
    Start[User สั่งปิดเซสชัน] --> Route[เปลี่ยนทิศทางไปยัง session_manager]
    Route --> Step1[1. อัปเดตสถานะ completed ใน session JSON]
    Step1 --> Step2[2. รีเซ็ต SESSION_TOTAL: 0 ใน session_tokens.md]
    Step2 --> Step3[3. อัปเดต phase: done ใน active_thread.md]
    Step3 --> Step4[4. สรุปความคืบหน้าถัดไปใน session_handoff.md]
    Step4 --> Confirm[ส่งข้อความรายงานไฟล์ที่บันทึกครบ 4 ไฟล์]
    Confirm --> End([สแตนด์บายรอเซสชันถัดไป])
```
