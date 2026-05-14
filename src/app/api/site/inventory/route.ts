import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { project_inventory } from "@/db/schema";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { eq, and } from "drizzle-orm";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id") || "P1";

    const env = getRequestContext().env;
    const db = getDb(env as any);

    const inventory = await db.select().from(project_inventory).where(eq(project_inventory.project_id, projectId));

    return NextResponse.json({ success: true, data: inventory });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to fetch inventory" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const env = getRequestContext().env;
    const db = getDb(env as any);
    const body = await request.json() as { project_id: string, inventory: { equipment_id: number, qty: number }[] };

    if (!body.project_id || !body.inventory) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    for (const item of body.inventory) {
      const existing = await db.select().from(project_inventory)
        .where(and(eq(project_inventory.project_id, body.project_id), eq(project_inventory.equipment_id, item.equipment_id)))
        .limit(1);

      if (existing.length > 0) {
        await db.update(project_inventory)
          .set({ qty: item.qty })
          .where(eq(project_inventory.id, existing[0].id));
      } else {
        await db.insert(project_inventory).values({
          project_id: body.project_id,
          equipment_id: item.equipment_id,
          qty: item.qty
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Failed to save inventory" }, { status: 500 });
  }
}
