import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { equipment_items, categories, sub_categories } from "@/db/schema";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import Papa from "papaparse";
import { eq } from "drizzle-orm";
import { invalidateCache } from "@/lib/cache";


export async function POST(request: NextRequest) {
  try {
    const env = getCloudflareContext().env;
    const db = getDb(env as any);

    const { searchParams } = new URL(request.url);
    const overwrite = searchParams.get("overwrite") === "true";

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    // Strip UTF-8 BOM if present
    let text = await file.text();
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

    const parsed = Papa.parse(text, {
      header: false,
      skipEmptyLines: true,
    });

    const rows = parsed.data as string[][];

    if (rows.length <= 1) {
      return NextResponse.json({ success: false, error: "File is empty or missing data rows" }, { status: 400 });
    }

    // Parse rows and collect unique categories/sub-categories
    const inserts: {
      item_code: string; name: string; category_code: string; sub_category_code: string;
      unit: string; buy_price: number; rent_price: number; lead_time: string; remaining_stock: number;
    }[] = [];
    const uniqueCategories = new Map<string, string>();
    const uniqueSubCategories = new Map<string, { code: string; category_code: string; name: string }>();

    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i];
      if (cols.length < 8) continue;

      const item_code       = cols[0];
      const name            = cols[1];
      const category_code   = cols[2];
      const sub_category_code = cols[3];
      const unit            = cols[4];
      const buy_price       = Math.round(Number(cols[5])) || 0;
      const rent_price      = Math.round(Number(cols[6])) || 0;
      const lead_time       = cols[7];
      const remaining_stock = Number(cols[8]) || 0;

      if (!item_code || !name || !category_code || !sub_category_code || !unit) continue;

      if (!uniqueCategories.has(category_code)) {
        uniqueCategories.set(category_code, category_code);
      }
      if (!uniqueSubCategories.has(sub_category_code)) {
        uniqueSubCategories.set(sub_category_code, { code: sub_category_code, category_code, name: sub_category_code });
      }

      inserts.push({ item_code, name, category_code, sub_category_code, unit, buy_price, rent_price, lead_time, remaining_stock });
    }

    if (inserts.length === 0) {
      return NextResponse.json({ success: false, error: "No valid rows found to insert" }, { status: 400 });
    }

    const catValues = Array.from(uniqueCategories.entries()).map(([code, name]) => ({ code, name }));
    const subCatValues = Array.from(uniqueSubCategories.values());

    // 1. Insert only categories that don't exist yet
    const existingCats = await db.select({ code: categories.code }).from(categories);
    const existingCatSet = new Set(existingCats.map((c) => c.code));
    const newCats = catValues.filter((c) => !existingCatSet.has(c.code));
    if (newCats.length > 0) {
      for (const cat of newCats) {
        await db.insert(categories).values(cat);
      }
    }

    // 2. Insert only sub-categories that don't exist yet
    const existingSubs = await db.select({ code: sub_categories.code }).from(sub_categories);
    const existingSubSet = new Set(existingSubs.map((s) => s.code));
    const newSubs = subCatValues.filter((s) => !existingSubSet.has(s.code));
    if (newSubs.length > 0) {
      for (const sub of newSubs) {
        await db.insert(sub_categories).values(sub);
      }
    }

    // 3. Insert only equipment items that don't exist yet
    // — avoids onConflictDoNothing which fails silently in Miniflare D1
    // — Drizzle includes `id` col → 10 cols/row, so SQLite 999-param limit = max 99 rows/batch
    const existingItems = await db.select().from(equipment_items);
    const existingItemMap = new Map(existingItems.map((e) => [e.item_code, e]));
    
    // Use a Set to track both existing DB items AND duplicates within the CSV itself
    const seenItemCodes = new Set();
    const newInserts = [];
    const updates = [];
    let duplicateCsvCount = 0;

    for (const item of inserts) {
      if (seenItemCodes.has(item.item_code)) {
        duplicateCsvCount++;
        continue;
      }
      seenItemCodes.add(item.item_code);

      const existing = existingItemMap.get(item.item_code);
      if (existing) {
        if (overwrite) {
          updates.push({ id: existing.id, ...item });
        }
      } else {
        newInserts.push(item);
      }
    }

    // Drizzle D1 edge runtime ไม่รองรับ multi-row insert → insert ทีละ 1 row
    for (const item of newInserts) {
      await db.insert(equipment_items).values(item);
    }

    // Update existing items if overwrite is true
    if (overwrite && updates.length > 0) {
      for (const item of updates) {
        await db.update(equipment_items)
          .set({
            name: item.name,
            category_code: item.category_code,
            sub_category_code: item.sub_category_code,
            unit: item.unit,
            buy_price: item.buy_price,
            rent_price: item.rent_price,
            lead_time: item.lead_time,
            remaining_stock: item.remaining_stock,
          })
          .where(eq(equipment_items.id, item.id));
      }
    }

    await invalidateCache(env.CACHE_KV);
    return NextResponse.json({
      success: true,
      message: `นำเข้าข้อมูลสำเร็จ: ` +
        `เพิ่มรายการใหม่ ${newInserts.length} รายการ | ` +
        (overwrite ? `เขียนทับข้อมูลเดิม ${updates.length} รายการ | ` : `ข้ามรายการซ้ำในระบบ/ในไฟล์ ${inserts.length - newInserts.length} รายการ | `) +
        `หมวดหลักใหม่ ${newCats.length} | หมวดย่อยใหม่ ${newSubs.length}`,
    });
  } catch (error) {
    console.error("Upload Equipment Error:", error);
    return NextResponse.json({ success: false, error: "Failed to process upload" }, { status: 500 });
  }
}
