# 🚨 Error Resolution Index (Knowledge Base)

เอกสารฉบับนี้ใช้สำหรับรวบรวมปัญหา (Error) ที่พบเจอบ่อยระหว่างการพัฒนาระบบ Asset Plan และวิธีแก้ไขที่ได้รับการพิสูจน์แล้ว เพื่อให้ AI และนักพัฒนาสามารถเข้ามาค้นหาวิธีแก้ปัญหาได้อย่างรวดเร็ว

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
