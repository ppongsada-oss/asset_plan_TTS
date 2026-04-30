import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { equipment_items } from "@/db/schema";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const env = getRequestContext().env;
    const db = getDb(env as any);

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    
    if (lines.length <= 1) {
      return NextResponse.json({ success: false, error: "File is empty or missing data rows" }, { status: 400 });
    }

    // Skip header, parse rows
    const inserts = [];
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(",");
      if (columns.length >= 8) {
        inserts.push({
          item_code: columns[0].trim(),
          name: columns[1].trim(),
          category: columns[2].trim(),
          sub_category: columns[3].trim(),
          unit: columns[4].trim(),
          buy_price: Number(columns[5]) || 0,
          rent_price: Number(columns[6]) || 0,
          lead_time: columns[7].trim()
        });
      }
    }

    if (inserts.length === 0) {
      return NextResponse.json({ success: false, error: "No valid rows found to insert" }, { status: 400 });
    }

    // Bulk Insert (Drizzle supports array insert natively)
    await db.insert(equipment_items).values(inserts).onConflictDoNothing();

    return NextResponse.json({ success: true, message: `Successfully inserted ${inserts.length} items.` });
  } catch (error) {
    console.error("Upload Equipment Error:", error);
    return NextResponse.json({ success: false, error: "Failed to process upload" }, { status: 500 });
  }
}
