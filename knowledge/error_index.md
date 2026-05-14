# 🚨 Error Resolution Index (Knowledge Base)

เอกสารฉบับนี้ใช้สำหรับรวบรวมปัญหา (Error) ที่พบเจอบ่อยระหว่างการพัฒนาระบบ Asset Plan และวิธีแก้ไขที่ได้รับการพิสูจน์แล้ว เพื่อให้ AI และนักพัฒนาสามารถเข้ามาค้นหาวิธีแก้ปัญหาได้อย่างรวดเร็ว

---

## Entry Template (agent must use this format for every new ERR)

```
## ERR-XXX: <Short title>
- **Task:** T-{ParentTask}-{BugID}-{AttemptID} · **Session:** session_<NNN>
- **File:** src/path/to/file.ts · **Line:** <N>
- **Symptom:** <what the error looks like>
- **Root Cause:** <why it happens>
- **Resolution:** <exact fix applied>
```

> **Task ID format:** `T-004-001-02` = Task T-004, Bug #1, Attempt #2
> **Cross-link rule:** roadmap `[X] T-004-001-01 (→ ERR-XXX)` ↔ error_index `Task: T-004-001-01`

---

## 🛑 ERR-001: Cloudflare D1 Local Database Crash (invalid digit found in string)

**🔥 อาการ (Symptom):**
เมื่อสั่งรัน `npm run dev` เซิร์ฟเวอร์ Next.js จะเกิด Error ทันทีในส่วนของ Database หรือ Miniflare และพ่น Log ออกมาแบบนี้:
```text
[Error: Failed to open database
Caused by:
    0: Loading persistence directory failed
    1: invalid digit found in string]
```

**🔍 สาเหตุ (Root Cause):**
ปัญหาไม่ได้เกิดจากโค้ดผิด แต่เกิดจาก **macOS AppleDouble Files (`._*`)**. 
เมื่อโปรเจกต์ถูกเก็บไว้ใน External Drive (เช่น ExFAT) หรือ Network Drive ตัว macOS จะแอบสร้างไฟล์ซ่อนที่ขึ้นต้นด้วย `._` (เช่น `._0000_snapshot.json`) เอาไว้ในโฟลเดอร์ `drizzle/` หรือ `.wrangler/`
เมื่อ Cloudflare Miniflare พยายามสแกนหาไฟล์ SQL Migration มันดันไปอ่านไฟล์ `._*` เหล่านี้ แล้วพยายามแปลงชื่อไฟล์เป็นตัวเลข Version ทำให้ระบบพัง (Crash) ทันที

**✅ วิธีแก้ไข (Resolution):**
ห้ามรัน `next dev` เพียวๆ แต่ต้องสั่งลบไฟล์ `._*` ทิ้งก่อนรันเสมอ
ได้ทำการแก้ไขแบบถาวรไว้ที่ไฟล์ `package.json` ในส่วนของ `scripts`:
```json
"dev": "find . -type f -name '._*' -delete 2>/dev/null || true; next dev"
```
*หากพบปัญหานี้ซ้ำ: ให้ลองพิมพ์คำสั่ง `find . -type f -name "._*" -delete` ใน Terminal ด้วยตัวเอง แล้วสั่งรันใหม่*

---

## 🛑 ERR-002: TypeScript "unknown" Type in Next.js 16 API Fetch

**🔥 อาการ (Symptom):**
เมื่อรัน `npm run build` จะพบ Error ตอน Compile:
```text
Type error: 'json' is of type 'unknown'.
```

**🔍 สาเหตุ (Root Cause):**
Next.js 16 มีความเข้มงวดเรื่อง Type มากขึ้น คำสั่ง `await res.json()` หรือ `await request.json()` จะถูกตีความว่าเป็นประเภท `unknown` ทันที ทำให้ไม่สามารถดึงค่าเช่น `json.success` ออกมาใช้งานได้

**✅ วิธีแก้ไข (Resolution):**
ให้ทำการ Cast ชนิดตัวแปรให้ชัดเจน หรือบังคับเป็น `any` ตอนดึงข้อมูล:
```typescript
// ฝั่ง Backend (route.ts)
const body = (await request.json()) as any;

// ฝั่ง Frontend (Fetch)
const json = (await res.json()) as any;
```

---

## 🛑 ERR-003: "Failed query: no such table" on Local D1 (next-on-pages)

**🔥 อาการ (Symptom):**
เมื่อรัน `npm run dev` และพยายามยิง API ที่ดึงข้อมูลจาก Database จะเกิด Error แบบนี้ใน Console:
```text
Failed query: select ... from "users" ...
```
และหน้าเว็บจะพัง หรือ API จะตีกลับ `status 500`. 

**🔍 สาเหตุ (Root Cause):**
ในไฟล์ `next.config.ts` การตั้งค่า `setupDevPlatform({ persist: false })` ทำให้ทุกครั้งที่รัน `next dev` ระบบจะสร้าง Database ในหน่วยความจำ (In-Memory) ขึ้นมาใหม่แบบว่างเปล่า (Empty) โดยไม่สนใจข้อมูลเก่าที่มีอยู่ในโฟลเดอร์ `.wrangler/state` ทำให้ตารางทั้งหมดหายไป

**✅ วิธีแก้ไข (Resolution):**
1. แก้ไขไฟล์ `next.config.ts` เปลี่ยนเป็น `persist: true`
2. ผู้ใช้ต้อง **กดหยุดเซิร์ฟเวอร์ (Ctrl+C)** แล้วสั่งรัน `npm run dev` ใหม่อีกครั้ง เพื่อให้ Next.js อ่าน Config ใหม่และเชื่อมต่อกับ `.wrangler/state` ที่มีตารางอยู่แล้ว

---

## 🛑 ERR-004: "A Node.js API is used (setImmediate) which is not supported in the Edge Runtime"

**🔥 อาการ (Symptom):**
เมื่อพยายาม Login หรือ Seed ข้อมูลผู้ใช้ จะเกิด Error บน Server Console:
```text
Error: A Node.js API is used (setImmediate) which is not supported in the Edge Runtime.
```
หน้าเว็บหรือ API จะคืนค่า `Invalid credentials` หรือ `status 500`.

**🔍 สาเหตุ (Root Cause):**
แพ็กเกจ `bcryptjs` มีการเรียกใช้คำสั่ง `setImmediate` ซึ่งเป็นคำสั่งที่มีเฉพาะใน Node.js ทำให้ไม่สามารถรันบน **Edge Runtime** (เช่น Cloudflare Pages หรือ Next.js Edge) ได้

**✅ วิธีแก้ไข (Resolution):**
ห้ามใช้ `bcryptjs` ใน Edge Runtime ให้เปลี่ยนไปใช้ **WebCrypto API** (`crypto.subtle`) ซึ่งเป็นมาตรฐานที่รองรับบนเบราว์เซอร์และ Edge เต็มรูปแบบแทน เช่น:
```typescript
const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password + SALT));
```


---

## 🛑 ERR-005: Next.js 15 Async searchParams Error

**🔥 อาการ (Symptom):**
เมื่อรันและเข้าใช้งานหน้าเว็บที่มีการดึงค่า `searchParams` จะพบ Error:
```text
Error: Route "/..." used `searchParams.project_id`. `searchParams` is a Promise and must be unwrapped with `await` or `React.use()` before accessing its properties.
```

**🔍 สาเหตุ (Root Cause):**
ใน Next.js 15 มีการเปลี่ยนแปลงแบบ Breaking Change โดยให้ `searchParams` และ `params` กลายเป็น Asynchronous (Promise) การดึงค่าแบบเดิมจึงเกิด Error

**✅ วิธีแก้ไข (Resolution):**
กำหนด Type เป็น `Promise` และเรียกใช้ `await` เสมอ:
```typescript
export default async function Page({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const resolvedParams = await searchParams;
  const id = resolvedParams?.id;
}
```

---

## 🛑 ERR-007: Bulk Upload Equipment — "Failed to process upload" (Miniflare D1 Multi-Row Insert)

**🔥 อาการ (Symptom):**
กด "อัปโหลดข้อมูล (Bulk)" แล้วขึ้น alert `Error: Failed to process upload` ทุกครั้ง ไม่ว่าจะลอง upload กี่ครั้งก็ตาม

**🔍 Root Cause ทั้งหมด (พบในลำดับนี้ — session_023):**

| # | จุดที่พัง | สาเหตุ |
|---|-----------|--------|
| 1 | CSV Parser | `split(",")` แบบ naive ทำให้ชื่อที่มี comma เช่น `"รอกสลิงไฟฟ้า ขนาด 1,000 Kg."` parse เพี้ยน |
| 2 | `onConflictDoNothing()` | Miniflare D1 local **ไม่รองรับ** `INSERT ... ON CONFLICT DO NOTHING` → "Failed query" ทุกครั้งที่มี conflict |
| 3 | `buy_price` / `rent_price` | Excel มีราคาทศนิยม เช่น `8596.03` แต่ schema กำหนดเป็น `integer` → Miniflare D1 enforce type อย่างเข้มงวด → Error |
| 4 | Multi-row INSERT | Drizzle D1 edge runtime layer **ไม่รองรับ multi-row INSERT** ไม่ว่า batch จะเล็กแค่ไหน (ลอง 99, ลอง chunk ต่างๆ ล้วน fail) → ต้อง insert ทีละ 1 row เท่านั้น |

**✅ วิธีแก้ไข (Final Resolution) — ใน `src/app/api/equipment/upload/route.ts`:**
1. **CSV Parser** → เปลี่ยนเป็น `papaparse` (package: `^5.5.3`) ซึ่งรองรับ edge runtime และ RFC-4180 ครบถ้วน
2. **onConflictDoNothing** → เปลี่ยนเป็น pattern `SELECT existing codes → filter → INSERT เฉพาะที่ยังไม่มี` (ใช้กับทั้ง categories, sub_categories, equipment_items)
3. **ราคาทศนิยม** → `Math.round(Number(cols[5]))` สำหรับ buy_price และ rent_price
4. **Multi-row INSERT** → insert ทีละ 1 row ใน for loop: `for (const item of newInserts) { await db.insert(...).values(item); }`

**⚠️ กฎสำคัญสำหรับโปรเจ็กต์นี้ (Miniflare D1 Local):**
> **ห้ามใช้ multi-row INSERT และ `onConflictDoNothing()` กับ Miniflare D1 local** เด็ดขาด ทั้งสองอย่างนี้ fail แบบ "Failed query" โดยไม่บอก error จริง ให้ใช้ SELECT+filter+single-row-insert แทนเสมอ

**📁 ไฟล์ข้อมูลที่ import สำเร็จ:**
`/Users/dude/Downloads/equipment_import.csv` — 536 รายการ (A:13, B:247, C:98, D:68, E:110)
สร้างจาก sheet WH ของ `202603 Asset Plan ไตรมาศ 2.xlsx`

---

## 🛑 ERR-006: React "Unexpected token" (Unclosed Fragment)

**🔥 อาการ (Symptom):**
หน้าเว็บ Crash พังพร้อมแสดง Error ใน Console:
```text
Unexpected token. Did you mean `{'}'}` or `&rbrace;`?
Parsing ecmascript source code failed
```

**🔍 สาเหตุ (Root Cause):**
เกิดจากการเขียน JSX ปิด Tag ไม่ครบ โดยเฉพาะการลืมปิด React Fragment (`</>`) เมื่อมีการเปิด (`<>`) ไว้ตั้งแต่ต้น

**✅ วิธีแก้ไข (Resolution):**
ตรวจสอบการจับคู่ Tag ใน Return Statement ให้ถูกต้อง โดยเฉพาะปิดท้าย:
```typescript
return (
  <>
    <div>...</div>
  </> // ต้องมีบรรทัดนี้ปิดท้ายเสมอ
);
```

---

## 🛑 ERR-008: CSV Parsing Failure on Apple Numbers Exports (Newlines in Quotes)

**🔥 อาการ (Symptom):**
เมื่อพยายามอัปโหลดไฟล์ CSV (Equipment Bulk Upload) ที่ Export มาจากโปรแกรม Apple Numbers หรือ Excel บางเวอร์ชัน จะเกิด Error `Failed to process upload` (Status 500) ในฝั่งเซิร์ฟเวอร์

**🔍 สาเหตุ (Root Cause):**
ไฟล์ที่นำมาอัปโหลดมีการกรอกข้อมูลแบบ **กดขึ้นบรรทัดใหม่ (Enter/Return) ภายในเซลล์เดียวกัน** (เช่น ชื่ออุปกรณ์ยาวแล้วกดปัดบรรทัด)
เมื่อโค้ดเก่าใช้คำสั่ง `text.split("\n")` เพื่อแยกแถว (Row) มันจะตัดคำตรงกลางเซลล์นั้นออกเป็น 2 บรรทัดทันที ทำให้คอลัมน์เคลื่อน (Column Mismatch) จำนวนคอลัมน์ไม่ครบตามที่กำหนด ระบบจึงข้ามบรรทัดนั้นไป และทำให้ข้อมูลที่เหลือดึงผิดช่องจน Insert ลง Database ไม่ได้

**✅ วิธีแก้ไข (Resolution):**
การเขียนฟังก์ชัน `parseCSVRow` เองไม่เพียงพอต่อการแก้ปัญหานี้ เนื่องจากต้องแยกแยะให้ออกว่า `\n` ตัวไหนอยู่ใน Quotes (`"`) ตัวไหนคือการขึ้นแถวใหม่จริง
**ต้องเปลี่ยนไปใช้ Library มาตรฐานสากลอย่าง `PapaParse`** แทน:
1. รัน `npm install papaparse --legacy-peer-deps`
2. เรียกใช้ใน `route.ts`:
```typescript
import Papa from "papaparse";

const parsed = Papa.parse(text, {
  header: false,
  skipEmptyLines: true,
});
const rows = parsed.data as string[][];
```
วิธีนี้ `Papa.parse` จะรับข้อความดิบ (Raw Text) ไปประมวลผลและจัดการปัญหา Newline/Comma ใน Quotes ได้อย่างสมบูรณ์แบบ

---

## 🛑 ERR-009: "no such table" or Failed Insert on New Schema Tables (Missing Local Migrations)

**🔥 อาการ (Symptom):**
เมื่อมีการเพิ่ม Table ใหม่ใน `schema.ts` (เช่น `planning_logs`) และพยายามเรียกใช้งานผ่าน API จะเกิด Error:
```text
Failed query: insert into "planning_logs" ...
no such table: planning_logs
```
หรือ API ตีกลับ status 500 โดยที่โค้ดดูถูกต้องทุกประการ

**🔍 สาเหตุ (Root Cause):**
แม้ว่าเราจะอัปเดตไฟล์ `schema.ts` แล้ว แต่เรายังไม่ได้สั่ง Generate และ Push Migration เข้าไปยัง Database ในเครื่อง (Local D1) ทำให้โครงสร้างใน DB จริงไม่ตรงกับที่ระบุในโค้ด

**✅ วิธีแก้ไข (Resolution):**
1. สั่ง Generate Migration ไฟล์ใหม่: `npx drizzle-kit generate`
2. นำ SQL จากไฟล์ที่สร้างขึ้นมา (ใน `db_migrations/`) ไปรันใน Local DB:
   ```bash
   npx wrangler d1 execute <db-name> --local --command="CREATE TABLE ..."
   ```
3. (ถาวรกว่า) ในอนาคตควรใช้ `npx drizzle-kit push` (หาก Config รองรับ) หรือตรวจสอบว่าทุกครั้งที่มีการเปลี่ยน Schema ได้ทำการรัน Migration ครบถ้วนแล้ว

---

## 🛑 ERR-010: "Element type is invalid" Runtime Error (Mixed Named/Default Imports)

**🔥 อาการ (Symptom):**
หน้าเว็บ Crash พังพร้อมแสดง Error สีแดง (Runtime Error) ใน Console:
```text
Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined. You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.
```

**🔍 สาเหตุ (Root Cause):**
เกิดจากการ Import คอมโพเนนต์ผิดรูปแบบ เช่น คอมโพเนนต์ต้นทางถูก Export แบบ **Named Export** (`export function MyComponent`) แต่ตอนนำไปใช้กลับ Import แบบ **Default Import** (`import MyComponent from "..."`) หรือในทางกลับกัน
ทำให้ตัวแปรคอมโพเนนต์ที่นำมาใช้มีค่าเป็น `undefined` และ React ไม่สามารถเรนเดอร์ได้

**✅ วิธีแก้ไข (Resolution):**
ตรวจสอบรูปแบบการ Export และ Import ให้ตรงกันเสมอ:
1. หากต้นทางเป็น `export function Navbar() { ... }` (Named)
   -> ปลายทางต้องใช้ `import { Navbar } from "@/components/layout/Navbar";` (มีปีกกา)
2. หากต้นทางเป็น `export default function ProjectManagement() { ... }` (Default)
   -> ปลายทางต้องใช้ `import ProjectManagement from "@/components/admin/ProjectManagement";` (ไม่มีปีกกา)

---

## 🛑 ERR-011: "Export db doesn't exist" (Edge Runtime D1 Connection)

**🔥 อาการ (Symptom):**
เมื่อรัน API route ใน Edge Runtime จะพบ Error:
```text
The export db was not found in module [project]/src/db/index.ts. Did you mean to import getDb?
```

**🔍 สาเหตุ (Root Cause):**
ในโปรเจกต์ที่ใช้ Cloudflare D1 ร่วมกับ `next-on-pages` เราไม่สามารถสร้าง Global Database Instance (`db`) ทิ้งไว้ได้ เพราะการเชื่อมต่อต้องอ้างอิงจาก `env` ของ Request นั้นๆ (Edge Runtime Context)

**✅ วิธีแก้ไข (Resolution):**
ห้าม `import { db }` โดยตรง ให้ใช้ `getDb` ร่วมกับ `getRequestContext()` ดังนี้:
1. ตั้งค่า `export const runtime = "edge";`
2. นำเข้าคอมโพเนนต์ที่จำเป็น:
   ```typescript
   import { getDb } from "@/db";
   import { getRequestContext } from "@cloudflare/next-on-pages";
   ```
3. ดึง `env` และสร้าง `db` instance ภายในฟังก์ชัน API:
   ```typescript
   const env = getRequestContext().env;
   const db = getDb(env as any);
   ```

---

## 🛑 ERR-012: Duplicated UI Components (Navbar Duplication)

**🔥 อาการ (Symptom):**
Navbar แสดงผลซ้อนกัน 2 อัน (Duplicated) โดยจะเห็นชัดเจนเมื่อมีการดัน Scroll หรือใช้ CSS Sticky/Fixed ทำให้ส่วนหัวของเว็บดูหนาผิดปกติหรือมีโลโก้ซ้ำกัน

**🔍 สาเหตุ (Root Cause):**
มีการเรียกใช้งานคอมโพเนนต์ `<Navbar />` ซ้ำซ้อนกันทั้งในไฟล์ **Layout หลัก (`src/app/layout.tsx`)** และในไฟล์ **Page เฉพาะหน้า (`src/app/.../page.tsx`)**
เนื่องจากโครงสร้างของ Next.js App Router จะนำ `layout.tsx` มาครอบ `page.tsx` เสมอ หากใส่ไว้ทั้งสองที่ คอมโพเนนต์จะถูกเรนเดอร์ออกมา 2 ครั้ง

**✅ วิธีแก้ไข (Resolution):**
ให้เลือกใส่ `<Navbar />` ไว้ที่เดียวเท่านั้น ซึ่งโดยปกติควรอยู่ที่ `src/app/layout.tsx` เพื่อให้แสดงผลเหมือนกันทุกหน้า (Global Navigation) และให้ลบ `<Navbar />` ออกจากไฟล์ `page.tsx` ของหน้านั้นๆ ดังนี้:
1. ตรวจสอบ `src/app/layout.tsx` ว่ามี `<Navbar />` ครอบ `{children}` อยู่แล้วหรือไม่
2. หากมีแล้ว ให้เปิดไฟล์ `page.tsx` ที่พบปัญหา แล้วลบคำสั่ง `import { Navbar } ...` และ `<Navbar />` ในส่วน Return Statement ออก

---

## 🛑 ERR-013: Browser Native Dialogs (confirm/alert) Blocking in Next.js Event Handlers

**🔥 อาการ (Symptom):**
เมื่อกดปุ่มที่มีการเรียกใช้ `window.confirm()` หรือ `confirm()` ใน Event Handler ระบบจะนิ่งไปเฉยๆ ไม่มีการแสดงหน้าต่างยืนยันขึ้นมา และโค้ดบรรทัดถัดไปจะไม่ถูกรัน (Execution Blocked) โดยไม่มี Error แสดงใน Console (พบได้บ่อยในเบราว์เซอร์ Firefox หรือเมื่อมีการใช้ Backdrop Blur ร่วมกับ Fixed Overlays)

**🔍 สาเหตุ (Root Cause):**
1. **Browser Policy**: เบราว์เซอร์บางตัวอาจบล็อก Dialog ที่เกิดจาก Asynchronous Event หรือสคริปต์ที่มองว่าเป็นการรบกวนผู้ใช้
2. **Focus/Overlay Conflict**: ใน Next.js เมื่อมีการใช้ `fixed` overlay และ `backdrop-blur` ตัวเบราว์เซอร์อาจเกิดปัญหาเรื่อง Focus Trap ทำให้หน้าต่าง Native Dialog ถูกซ่อนอยู่ข้างหลังหรือถูกยกเลิกทันที

**✅ วิธีแก้ไข (Resolution):**
ห้ามใช้ `window.confirm()` หรือ `alert()` ในฟังก์ชันที่สำคัญ ให้เปลี่ยนไปใช้ **Custom Confirmation Modal (React Component)** หรือใช้การเช็ค State เพื่อแสดง UI ยืนยันแทน เพื่อให้แน่ใจว่าระบบจะทำงานได้ในทุกเบราว์เซอร์และไม่เกิดการ Block การทำงานของ Main Thread

---

## 🛑 ERR-014: Matrix Report Tooltip Missing on Zero Quantities

**🔥 อาการ (Symptom):**
เมื่อนำเมาส์ไปชี้ (Hover) ที่คอลัมน์ "ค้างรับ" หรือ "ค้างส่ง" ในหน้า Matrix Report แล้วไม่มี Tooltip แสดงผลขึ้นมา โดยเฉพาะเมื่อยอดค้างเป็น "0" (สีเขียว) ทั้งที่ควรจะแสดงรายละเอียดสิ่งที่ดำเนินการไปแล้ว

**🔍 สาเหตุ (Root Cause):**
1. **API Logic**: เดิม API จะส่งข้อมูล `details` มาให้เฉพาะเมื่อมี "ยอดค้างจริง" (`qty > 0`) เท่านั้น เมื่อรายการถูกจัดการจนยอดค้างเป็น 0 ตัว API จะไม่ส่งรายละเอียดของโครงการนั้นมาใน Array
2. **Frontend Logic**: คอมโพเนนต์ `<BreakdownTooltip />` มีเงื่อนไข `if (items.length === 0) return null;` ทำให้เมื่อไม่มีข้อมูลจาก API ตัว Tooltip จะไม่ถูกเรนเดอร์ออกมาเลย

**✅ วิธีแก้ไข (Resolution):**
ปรับปรุง API ใน `src/app/api/reports/matrix/route.ts` ให้ส่งข้อมูลโครงการที่มีการดำเนินการแล้ว (Handled) กลับมาด้วย แม้ยอดค้างจะเป็น 0 โดยคำนวณจาก:
- **ค้างส่ง**: `Original Demand - Supplied`
- **ค้างรับ**: `Original Excess - Received - Rejected`
และปรับ Frontend ให้แสดงผลยอด 0 ด้วยสีที่จางลง (Slate-500) เพื่อให้ผู้ใช้ยังคงเห็นประวัติการทำงานใน Tooltip ได้

---

## 🛑 ERR-015: Matrix Report Tooltip Double Counting (Wrong Pending Value)

**🔥 อาการ (Symptom):**
ใน Tooltip รายละเอียดค้างส่ง (Pending Demand) แสดงค่า `Pending` ผิดพลาด ทั้งที่ `Required` และ `Supplied` เท่ากันแล้ว (เช่น 3 และ 3) แต่ระบบยังคำนวณค้างเป็น 3 และแสดงสถานะเป็น Waiting

**🔍 สาเหตุ (Root Cause):**
**Baseline Adjustment Error**: ใน API เดิมมีการนำค่า `projectTotalSupplied` ไปลบออกจาก `currentInv` ก่อนจะนำมาหา `originalNetGap` แต่เนื่องจาก `currentInv` เป็นค่า Baseline ที่ยังไม่ถูกอัปเดตตามมติการจัดการใน Cycle นั้นๆ (Stable Baseline) การนำไปลบออกจึงทำให้ยอด Demand เริ่มต้นสูงเกินจริง (Double Counting) ส่งผลให้ยอดคงค้างผิดเพี้ยน

**✅ วิธีแก้ไข (Resolution):**
แก้ไขใน `src/app/api/reports/matrix/route.ts` โดยให้ใช้ `currentInv` เป็นค่า Baseline ตั้งต้นตรงๆ โดยไม่ต้องนำผลการตัดสินใจ (Actions) มาบวกหรือลบกลับ และคำนวณ `Pending` จาก `OriginalGap - HandledActions` เพื่อให้ได้ค่าที่ถูกต้องตามความเป็นจริง

---

## 🛑 ERR-016: Matrix Report Stale Data (Cache Invalidation Failure)

**🔥 อาการ (Symptom):**
เมื่อผู้ใช้ทำการตัดสินใจในหน้า Store Center Hub (เช่น กดสั่งซื้อ, เช่า, หรือเบิกจ่าย) หรือเมื่อ PM ทำการอนุมัติใบงาน แต่ข้อมูลในหน้า Matrix Report กลับไม่เปลี่ยนแปลงตามข้อมูลล่าสุด ต้องรอนานถึง 5 นาที หรือข้อมูลไม่เปลี่ยนเลย

**🔍 สาเหตุ (Root Cause):**
1. **Mismatched Cache Keys**: ใน API `POST /api/center/decisions` มีการสั่งลบ Cache ด้วยคีย์แบบตายตัวคือ `"matrix_report"` แต่ใน Matrix Report API ใช้คีย์แบบ Dynamic ตาม Version และ Filter (เช่น `matrix_report_v3_c1_...`) ทำให้การลบ Cache เดิมไม่ได้ผล
2. **Missing Invalidation Points**: ในส่วนของ PM Approval และ Site Planning ไม่มีการสั่งล้าง Cache ของ Matrix Report เลย เมื่อมีการอนุมัติหรือแก้ไขแผนงาน ข้อมูลภาพรวมจึงยังคงเป็นค่าเก่าที่ค้างอยู่ในระบบ

**✅ วิธีแก้ไข (Resolution):**
ปรับปรุงการล้าง Cache ให้ครอบคลุมทุกจุดที่มีการเปลี่ยนแปลงข้อมูล โดยใช้คำสั่ง `kv.list({ prefix: "matrix_report_v3_" })` เพื่อค้นหา Cache Key ทั้งหมดที่ขึ้นต้นด้วยชื่อนี้และสั่งลบทั้งหมด (Prefix-based Deletion) ใน 3 จุดหลัก:
1. `src/app/api/center/decisions/route.ts` (ทั้ง POST และ DELETE)
2. `src/app/api/pm/jobs/approve/route.ts`
3. `src/app/api/site/plans/route.ts`
---

## 🛑 ERR-017: Redundant Variable Definition (Ecmascript file error)

**🔥 อาการ (Symptom):**
เมื่อรัน API หรือคอมโพเนนต์จะพบ Error ใน Console/Build Log:
```text
the name 'searchParams' is defined multiple times
./src/app/api/.../route.ts (L:C)
Ecmascript file had an error
```

**🔍 สาเหตุ (Root Cause):**
เกิดจากการประกาศตัวแปรที่มีชื่อเดียวกันซ้ำซ้อนกันใน Scope เดียวกัน (มักเกิดจากการ Copy-Paste โค้ดหรือการอัปเดตโค้ดหลายครั้งในฟังก์ชันเดียว) ทำให้ JavaScript Engine ไม่สามารถประมวลผลไฟล์ได้

**✅ วิธีแก้ไข (Resolution):**
ตรวจสอบและลบการประกาศตัวแปรซ้ำ (Redundant Definition) ออก หรือเปลี่ยนชื่อตัวแปรเพื่อหลีกเลี่ยงการซ้อนทับ (Shadowing) ดังนี้:
1. ตรวจสอบต้นฟังก์ชันว่ามีการประกาศ `const { searchParams } = ...` ไว้แล้วหรือไม่
2. ลบบรรทัดที่มีการประกาศซ้ำ หรือใช้การตั้งชื่อเล่น (Alias) เช่น `const { searchParams: sp } = ...` เพื่อความปลอดภัย
3. ตรวจสอบให้แน่ใจว่าไม่มีการประกาศตัวแปรชื่อเดียวกันใน Scope ที่ซ้อนกัน
---

## 🛑 ERR-018: JSON.parse: unexpected character at line 1 column 1

**🔥 อาการ (Symptom):**
พบ Error ใน Browser Console:
```text
SyntaxError: JSON.parse: unexpected character at line 1 column 1 of the JSON data
```
มักเกิดขึ้นเมื่อโค้ดฝั่ง Client พยายาม `fetch` ข้อมูลและแปลงเป็น JSON แต่ API ส่งคืนค่าที่ไม่ใช่ JSON (เช่น HTML 404 Page หรือ Text Error)

**🔍 สาเหตุ (Root Cause):**
1. เรียกใช้งาน API Path ที่ไม่มีอยู่จริง (404) ทำให้เซิร์ฟเวอร์ส่งคืนหน้า HTML Error แทนที่จะเป็น JSON
2. API เกิด Runtime Error (500) และส่งคืน Text stack trace แทน JSON
3. ลืมใส่ Prefix ของ API Path เช่น `/api/center/cycles` แต่ไปเรียก `/api/cycles`

**✅ วิธีแก้ไข (Resolution):**
1. ตรวจสอบ Network Tab ใน Browser เพื่อดูว่า API ที่เรียกคืนค่าเป็นอะไร (Status Code และ Response Body)
2. ตรวจสอบ API Path ในโค้ดให้ตรงกับที่มีอยู่จริงใน `src/app/api/...`
3. เพิ่มการตรวจสอบการ `fetch` ก่อนเรียก `.json()`:
```javascript
const res = await fetch(url);
if (!res.ok) throw new Error("API status: " + res.status);
const json = await res.json();
```

---

## 🛑 ERR-019: Missing Session Initialization & Manifest Lookup

- **Task:** T-019-ERR-01 · **Session:** session_054
- **File:** .agents/skills/session_manager/SKILL.md · **Line:** 22
- **Symptom:** Agent starts a new feature or refactoring task without creating a new session file or reading the skill manifest, leading to missing operational logs.
- **Root Cause:** Prioritizing task-specific info gathering (Phase 1) while bypassing the mandatory Boot Sequence (B2) and Session Rotation protocol.
- **Resolution:** Strictly enforce the Boot Sequence. Before any Phase 1 activity on a new topic, perform a Manifest lookup and execute Session Rotation (creating a new `.sessions/session_xxx.json`) as mandated by the project governance.

---

## 🛑 ERR-020: TypeError: can't access property "urgency", r is undefined

- **Task:** T-020-ERR-01 · **Session:** session_055
- **File:** src/hooks/use-requests.ts · **Line:** 28
- **Symptom:** หน้าจอ **CenterDashboard** ค้างและแสดง Error `can't access property "urgency", r is undefined` เมื่อระบบพยายามโหลดข้อมูลใบขอเบิก/จัดหา
- **Root Cause:** ตัว Hook `useCenterRequests` ใช้คำสั่ง `flatMap` ในการรวมข้อมูลแต่ละหน้า (Pagination) โดยไม่ได้ตรวจสอบว่าข้อมูลในหน้านั้นมีค่าหรือไม่ (เช่น กรณี API Error หรือไม่มีข้อมูล) ทำให้มีค่า `undefined` หลุดเข้าไปในอาเรย์ `requests` เมื่อ UI พยายามแมพข้อมูลมาแสดงผลและเรียกใช้ property `.urgency` จึงเกิดการ Crash
- **Resolution:** 
  1. แก้ไข Hook ใน `src/hooks/use-requests.ts` ให้ใช้ Optional Chaining และ Filter เพื่อกรองเฉพาะข้อมูลที่ถูกต้อง: `.flatMap((page) => page?.data || []).filter(Boolean)`
  2. เพิ่มความปลอดภัยในฝั่ง UI `src/components/store-center/CenterDashboard.tsx` ด้วยการใช้ Optional Chaining (`r?.urgency`) ในทุกจุดที่เข้าถึงข้อมูล เพื่อป้องกันการ Crash หากข้อมูลไม่สมบูรณ์

- **Update (Attempt 2):** พบว่านอกจากปัญหา `undefined` ในอาเรย์แล้ว ยังมีปัญหาที่ Logic การ Query (SQL Join) ที่มีความเข้มงวดเกินไป ทำให้รายการที่ไม่มี `job_id` หรือไม่อยู่ในงวดงานที่เลือกถูกกรองออกทั้งหมด ได้ทำการ Refactor API ให้ดึงข้อมูลแบบกว้างขึ้นและมาทำการกรอง (Filter) ในระดับ JavaScript แทน เพื่อความแม่นยำและป้องกันข้อมูลหาย

---

## 🛑 ERR-021: Store Center Reject Return Propagation Bug

- **Task:** T-011-001-01 · **Session:** session_057
- **File:** src/app/api/center/decisions/route.ts
- **Symptom:** ปฏิเสธการคืน (Reject Return) ในเดือนหนึ่งแล้ว ทำให้เดือนถัดไป (ที่เคยจัดการเสร็จแล้ว) กลับมาแสดงผลเป็นรายการค้างคืน (Pending Return) ใหม่โดยอัตโนมัติ
- **Root Cause:** เดิมระบบอัปเดตยอด `required_qty` เฉพาะเดือนที่กดปฏิเสธเท่านั้น แต่เนื่องจาก Asset Plan เป็นข้อมูลต่อเนื่อง หากเดือน N เพิ่มขึ้นแต่เดือน N+1 เท่าเดิม จะเกิดความต่าง (Delta) ที่ API `requests` จะมองว่าเป็นรายการคืนใหม่ (Phantom Return)
- **Resolution:** แก้ไข API Decisions (ทั้ง POST และ DELETE) ให้ทำการขยายผล (Propagate) การเพิ่ม/ลด `required_qty` ไปยังเดือนปัจจุบันและ **ทุกเดือนในอนาคต** ของโครงการและอุปกรณ์เดียวกัน เพื่อรักษาความต่อเนื่องของแผนงาน

---

## 🛑 ERR-022: Store Center Tab Count Mismatch

- **Task:** T-011-002-01 · **Session:** session_055
- **File:** src/app/api/center/requests/route.ts
- **Symptom:** ตัวเลขบน Tab ใน Store Center Hub (New Demand / Expected Returns) แสดงผลเป็น "0" สำหรับ Tab ที่ไม่ได้เลือก หรือเปลี่ยนเป็น "0" เมื่อสลับหน้า
- **Root Cause:** API เดิมทำการกรองข้อมูลตามประเภท (Type) ก่อนที่จะส่งกลับมา ทำให้ยอดรวม (Total) ที่ส่งกลับมาหน้าบ้านมีเพียงประเภทเดียว ข้อมูลอีกประเภทจึงกลายเป็น 0 เสมอเมื่อ UI พยายามนับจากอาเรย์ผลลัพธ์
- **Resolution:** 
  1. แก้ไข API ใน `src/app/api/center/requests/route.ts` ให้ทำการคำนวณจำนวนของทั้งสองประเภท (`demand` และ `return`) หลังจากกรองด้วยเงื่อนไขค้นหา/งวดงานแล้ว แต่ **ก่อน** จะทำการกรองแยกตามประเภทเพื่อทำ Pagination
  2. ส่งค่า `counts: { demand, return }` กลับมาใน JSON response
  3. ปรับปรุง Hook `useCenterRequests` ให้ดึงค่า `counts` นี้ออกมา และปรับปรุง UI `CenterDashboard.tsx` ให้ใช้ค่าจาก API แทนการนับเองในตัวแปร `requests`

---

## 🛑 ERR-023: Matrix Report Row Focusing UX Issue

- **Task:** T-015.2 · **Session:** session_055
- **File:** src/app/matrix-report/page.tsx · **Line:** 513
- **Symptom:** เมื่อเลื่อนตาราง (Scroll) ลงมาด้านล่าง ผู้ใช้โฟกัสแถวที่กำลังดูอยู่ได้ยาก (Hard to focus on current row)
- **Root Cause:** ตารางมีข้อมูลจำนวนมากและขาดตัวเลขลำดับแถว (Running Number) ทำให้การอ้างอิงหรือติดตามแถวขณะเลื่อนหน้าจอทำได้ยาก
- **Resolution:** เพิ่มคอลัมน์ Running Number (#) ที่ตำแหน่งแรกของตาราง โดยกำหนดให้เป็น Sticky (left-0) เพื่อให้มองเห็นเลขลำดับได้ตลอดเวลาแม้จะเลื่อนไปทางขวา และช่วยให้การกวาดสายตา (Eye scanning) ทำได้สะดวกขึ้น

---

## 🛑 ERR-024: Store Center Hub Row Tracking UX Issue

- **Task:** T-011.1 · **Session:** session_056
- **File:** src/components/store-center/CenterDashboard.tsx · **Line:** 486
- **Symptom:** ผู้ใช้งานติดตามแถวที่กำลังดำเนินการได้ยากเมื่อรายการใน Store Center Hub มีจำนวนมาก
- **Root Cause:** ขาดตัวบ่งชี้ลำดับแถว (Running Number) ในตารางหลัก ทำให้การอ้างอิงลำดับขณะเลื่อนหน้าจอทำได้ยาก
- **Resolution:** เพิ่มคอลัมน์ # ต่อจาก Checkbox ในตารางหลักของ CenterDashboard โดยใช้ index จากการ map ข้อมูล เพื่อแสดงลำดับแถวที่ชัดเจน ช่วยเพิ่มความแม่นยำในการใช้งาน

---

## 🛑 ERR-025: Global Table Focus & Navigation Issue

- **Task:** T-011.2, T-011.3 · **Session:** session_056
- **Files:** src/components/site-plan/PMReviewTable.tsx, src/components/site-plan/PlanningWorksheet.tsx
- **Symptom:** ผู้ใช้งานหลงลืมลำดับแถวขณะทำการ Review หรือวางแผนแผนงานที่มีปริมาณอุปกรณ์จำนวนมาก
- **Root Cause:** ขาดคอลัมน์อ้างอิงลำดับ (#) แบบคงที่ (Sticky) ทำให้เมื่อเลื่อนตารางไปทางขวาหรือลงล่าง ผู้ใช้ไม่สามารถระบุลำดับแถวที่กำลังทำงานอยู่ได้ง่าย
- **Resolution:** เพิ่มคอลัมน์ Running Number (#) แบบ Sticky left-0 ในทั้ง PM Review Table และ Planning Worksheet และปรับให้ชื่ออุปกรณ์เป็น Sticky left-[40px] พร้อมเงาจางๆ (shadow) เพื่อแยกชั้นข้อมูลให้ชัดเจน ช่วยให้การกรอกข้อมูลและตรวจสอบข้อมูลในตารางขนาดใหญ่ทำได้รวดเร็วและแม่นยำขึ้น

---

## 🛑 ERR-026: Matrix Report Sticky Header Alignment & Layering

- **Task:** T-015-001-03 · **Session:** session_057
- **File:** src/app/matrix-report/page.tsx · **Line:** 411
- **Symptom:** หัวตาราง Matrix Report แสดงผลผิดเพี้ยน (เละ) เมื่อทำการ Scroll โดยมีอาการซ้อนทับกันของหัวตารางแถวที่ 1 และ 2 หรือมีช่องว่างระหว่างแถว
- **Root Cause:** 1) การใช้ค่าคงที่ `top-[68px]` สำหรับหัวตารางแถวที่สองไม่ตรงกับความสูงจริงของแถวแรก 2) การตั้งค่า `z-index` ไม่เป็นลำดับชั้น (Hierarchical) ทำให้คอลัมน์ Sticky ถูกหัวตารางทับ หรือหัวตารางทับกันเอง
- **Resolution:** 
  1. ปรับปรุงระบบ **Z-Index Layering**: Intersection (Top-Left) = `z-[100]`, Top Headers = `z-[50]`, Second Headers = `z-[40]`, Body Sticky = `z-[30]`
  2. ปรับระยะ **Top Offset**: ใช้ `40px` และบังคับความสูงแถวแรกด้วย `h-[40px]` เพื่อความแม่นยำ
  3. แก้ไข **Sub-pixel Gap**: ใช้การ Overlap คอลัมน์ที่สองทับคอลัมน์แรก 1px (`left-[49px]` ทับ `w-[50px]`) และใส่ `div` ล็อคความกว้างไว้ภายใน เพื่อป้องกัน Browser คำนวณความกว้างเพี้ยนจนเกิดรอยแยกสีขาว
  4. เพิ่ม **Visual Depth**: ใช้ `shadow-[1px_0_0_0_#e2e8f0]` แทน `border-r` เพื่อให้เส้นแบ่งมีความหนาคงที่ 1px และไม่กระทบการคำนวณ Box Model

---

## 🛑 ERR-027: Tooltip Clipped by Card Container (Overflow Issue)

- **Task:** T-038-001-01 · **Session:** session_059
- **File:** src/components/admin/ProjectManagement.tsx · **Line:** 154
- **Symptom:** Tooltip ที่แสดงรายการอุปกรณ์ในหน้า Admin Projects ถูกขอบ Card ตัดขาด (Clipped) ไม่สามารถแสดงผลทะลุออกมานอก Card ได้
- **Root Cause:** คอนเทนเนอร์ของ Card มีการใช้คลาส `overflow-hidden` ซึ่งจะตัดเนื้อหาใดๆ ที่อยู่นอกขอบเขตของ Card ทิ้ง รวมถึง Tooltip ที่ใช้ `absolute` positioning
- **Resolution:** นำคลาส `overflow-hidden` ออกจากคอนเทนเนอร์ของ Card และเพิ่ม `hover:z-20` เพื่อให้ Card ที่ถูก Hover ลอยขึ้นมาอยู่เหนือ Card ใบอื่น (Stacking Context) ทำให้ Tooltip แสดงผลได้อย่างสมบูรณ์และสวยงาม
