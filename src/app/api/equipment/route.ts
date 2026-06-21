import { NextRequest, NextResponse } from "next/server";
import { getDb, type Env } from "@/db";
import { equipment_items, categories, sub_categories } from "@/db/schema";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { desc, eq } from "drizzle-orm";
import { EQUIPMENT_CACHE_KEY, invalidateCache } from "@/lib/cache";
import { requireRole, requireAuth, hasGlobalRole } from "@/lib/auth-check";

type EquipmentMutationBody = {
  id?: number;
  item_code?: string;
  name?: string;
  category_code?: string | null;
  sub_category_code?: string | null;
  unit?: string;
  buy_price?: number | string;
  rent_price?: number | string;
  lead_time?: string | null;
  remaining_stock?: number | string;
};


export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.ok) return auth.response;

    // Only ADMIN / STORE_CENTER may see pricing; lower roles get the catalog
    // with buy_price/rent_price stripped. The KV cache always stores the full
    // (privileged) payload, so stripping is applied per-request after read.
    const canSeePrices = hasGlobalRole(auth.payload, ["ADMIN", "STORE_CENTER"]);
    const projectResponse = (payload: { success: true; data: unknown[] }) => {
      if (canSeePrices) return payload;
      const data = payload.data.map((item) => {
        const row = { ...(item as Record<string, unknown>) };
        delete row.buy_price;
        delete row.rent_price;
        return row;
      });
      return { ...payload, data };
    };

    const env = getCloudflareContext().env as Env;
    const db = getDb(env);
    const kv = env.CACHE_KV;

    const cached = await kv?.get(EQUIPMENT_CACHE_KEY, "json") as { success: true; data: unknown[] } | null;
    if (cached) {
      return NextResponse.json(projectResponse(cached));
    }

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

    const payloadResponse = { success: true as const, data: items };
    await kv?.put(EQUIPMENT_CACHE_KEY, JSON.stringify(payloadResponse), { expirationTtl: 120 });
    return NextResponse.json(projectResponse(payloadResponse));
  } catch (error) {
    console.error("GET Equipment Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch equipment" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ["ADMIN", "STORE_CENTER"]);
    if (!auth.ok) return auth.response;

    const env = getCloudflareContext().env as Env;
    const db = getDb(env);
    const body = (await request.json()) as EquipmentMutationBody;

    if (!body.item_code || !body.name || !body.category_code || !body.unit) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const newItem = await db.insert(equipment_items).values({
      item_code: body.item_code,
      name: body.name,
      category_code: body.category_code,
      sub_category_code: body.sub_category_code || "",
      unit: body.unit,
      buy_price: Number(body.buy_price) || 0,
      rent_price: Number(body.rent_price) || 0,
      lead_time: body.lead_time || "",
      remaining_stock: Number(body.remaining_stock) || 0,
    }).returning();

    await invalidateCache(env.CACHE_KV);
    return NextResponse.json({ success: true, data: newItem[0] });
  } catch (error) {
    console.error("POST Equipment Error:", error);
    return NextResponse.json({ success: false, error: "Failed to create equipment" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireRole(request, ["ADMIN", "STORE_CENTER"]);
    if (!auth.ok) return auth.response;

    const env = getCloudflareContext().env as Env;
    const db = getDb(env);
    const body = (await request.json()) as EquipmentMutationBody;

    if (!body.id) {
      return NextResponse.json({ success: false, error: "Missing equipment ID" }, { status: 400 });
    }

    await db.update(equipment_items)
      .set({
        name: body.name,
        category_code: body.category_code || "",
        sub_category_code: body.sub_category_code || "",
        unit: body.unit,
        buy_price: Number(body.buy_price) || 0,
        rent_price: Number(body.rent_price) || 0,
        lead_time: body.lead_time || "",
        remaining_stock: Number(body.remaining_stock) || 0,
      })
      .where(eq(equipment_items.id, body.id));

    await invalidateCache(env.CACHE_KV);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT Equipment Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update equipment" }, { status: 500 });
  }
}
