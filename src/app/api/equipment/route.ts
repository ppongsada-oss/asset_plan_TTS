import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { equipment_items } from "@/db/schema";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { desc } from "drizzle-orm";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const env = getRequestContext().env;
    const db = getDb(env as any);

    const items = await db.select().from(equipment_items).orderBy(desc(equipment_items.id));
    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error("GET Equipment Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch equipment" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const env = getRequestContext().env;
    const db = getDb(env as any);
    const body = await request.json();

    const newItem = await db.insert(equipment_items).values({
      item_code: body.item_code,
      name: body.name,
      category: body.category,
      sub_category: body.sub_category,
      unit: body.unit,
      buy_price: Number(body.buy_price) || 0,
      rent_price: Number(body.rent_price) || 0,
      lead_time: body.lead_time || "",
    }).returning();

    return NextResponse.json({ success: true, data: newItem[0] });
  } catch (error) {
    console.error("POST Equipment Error:", error);
    return NextResponse.json({ success: false, error: "Failed to create equipment" }, { status: 500 });
  }
}
