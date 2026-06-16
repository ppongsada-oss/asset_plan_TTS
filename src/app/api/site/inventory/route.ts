import { NextRequest, NextResponse } from "next/server";
import { getDb, type Env } from "@/db";
import { project_inventory } from "@/db/schema";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, and } from "drizzle-orm";
import { requireProject } from "@/lib/auth-check";
import { getSiteInventoryCacheKey, invalidateCache } from "@/lib/cache";


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("project_id") || "P1";

    const auth = await requireProject(request, projectId);
    if (!auth.ok) return auth.response;

    const env = getCloudflareContext().env as Env;
    const db = getDb(env);
    const cacheKey = getSiteInventoryCacheKey(projectId);
    const cached = await env.CACHE_KV?.get(cacheKey, "json") as { success: true; data: unknown[] } | null;
    if (cached) {
      return NextResponse.json(cached);
    }

    const inventory = await db.select().from(project_inventory).where(eq(project_inventory.project_id, projectId));

    const payloadResponse = { success: true, data: inventory };
    await env.CACHE_KV?.put(cacheKey, JSON.stringify(payloadResponse), { expirationTtl: 120 });
    return NextResponse.json(payloadResponse);
  } catch {
    return NextResponse.json({ success: false, error: "Failed to fetch inventory" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const env = getCloudflareContext().env as Env;
    const db = getDb(env);
    const body = await request.json() as { project_id: string, inventory: { equipment_id: number, qty: number }[] };

    if (!body.project_id || !body.inventory) {
      return NextResponse.json({ success: false, error: "Missing fields" }, { status: 400 });
    }

    const auth = await requireProject(request, body.project_id, ["SITE"]);
    if (!auth.ok) return auth.response;

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

    await invalidateCache(env.CACHE_KV);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to save inventory" }, { status: 500 });
  }
}
