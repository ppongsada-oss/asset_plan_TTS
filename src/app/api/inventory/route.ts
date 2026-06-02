import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { project_inventory } from "@/db/schema";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";


export async function GET(request: NextRequest) {
  try {
    const env = getCloudflareContext().env;
    const db = getDb(env as any);

    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get("cycle_id");

    if (!cycleId) {
      return NextResponse.json({ success: false, error: "Missing cycle_id parameter" }, { status: 400 });
    }

    const inventory = await db.select()
      .from(project_inventory)
      .where(eq(project_inventory.cycle_id, parseInt(cycleId)));

    return NextResponse.json({ success: true, data: inventory });
  } catch (error: any) {
    console.error("GET Inventory Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch inventory" }, { status: 500 });
  }
}
