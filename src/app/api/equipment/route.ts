import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { equipment_items, categories, sub_categories } from "@/db/schema";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { desc, eq } from "drizzle-orm";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const env = getRequestContext().env;
    const db = getDb(env as any);

    // Join with categories to return human readable names
    const items = await db.select({
      id: equipment_items.id,
      item_code: equipment_items.item_code,
      name: equipment_items.name,
      category_code: equipment_items.category_code,
      category_name: categories.name,
      sub_category_code: equipment_items.sub_category_code,
      sub_category_name: sub_categories.name,
      unit: equipment_items.unit,
      buy_price: equipment_items.buy_price,
      rent_price: equipment_items.rent_price,
      lead_time: equipment_items.lead_time,
      remaining_stock: equipment_items.remaining_stock,
    })
    .from(equipment_items)
    .leftJoin(categories, eq(equipment_items.category_code, categories.code))
    .leftJoin(sub_categories, eq(equipment_items.sub_category_code, sub_categories.code))
    .orderBy(desc(equipment_items.id));

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
    const body = (await request.json()) as any;

    const newItem = await db.insert(equipment_items).values({
      item_code: body.item_code,
      name: body.name,
      category_code: body.category_code,
      sub_category_code: body.sub_category_code,
      unit: body.unit,
      buy_price: Number(body.buy_price) || 0,
      rent_price: Number(body.rent_price) || 0,
      lead_time: body.lead_time || "",
      remaining_stock: Number(body.remaining_stock) || 0,
    }).returning();

    return NextResponse.json({ success: true, data: newItem[0] });
  } catch (error) {
    console.error("POST Equipment Error:", error);
    return NextResponse.json({ success: false, error: "Failed to create equipment" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const env = getRequestContext().env;
    const db = getDb(env as any);
    const body = (await request.json()) as any;

    if (!body.id) {
      return NextResponse.json({ success: false, error: "Missing equipment ID" }, { status: 400 });
    }

    await db.update(equipment_items)
      .set({
        name: body.name,
        category_code: body.category_code,
        sub_category_code: body.sub_category_code,
        unit: body.unit,
        buy_price: Number(body.buy_price) || 0,
        rent_price: Number(body.rent_price) || 0,
        lead_time: body.lead_time || "",
        remaining_stock: Number(body.remaining_stock) || 0,
      })
      .where(eq(equipment_items.id, body.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT Equipment Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update equipment" }, { status: 500 });
  }
}
