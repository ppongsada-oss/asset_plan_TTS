import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { planning_cycles, planning_jobs } from "@/db/schema";
import { desc } from "drizzle-orm";
import { requireRole } from "@/lib/auth-check";
import { CENTER_CYCLES_CACHE_KEY, invalidateCache } from "@/lib/cache";


export async function GET(req: NextRequest) {
  try {
    const auth = await requireRole(req, ["ADMIN", "STORE_CENTER"]);
    if (!auth.ok) return auth.response;

    const env = getCloudflareContext().env;
    const db = getDb(env as any);
    const kv = (env as any).CACHE_KV;

    if (kv) {
      const cached = await kv.get(CENTER_CYCLES_CACHE_KEY, "json");
      if (cached) {
        return NextResponse.json({ ...cached, fromCache: true });
      }
    }
    
    const cycles = await db.select().from(planning_cycles).orderBy(desc(planning_cycles.created_at));
    const jobs = await db.select().from(planning_jobs);
    
    const result = cycles.map(cycle => ({
      ...cycle,
      jobs: jobs.filter(j => j.cycle_id === cycle.id)
    }));

    const responsePayload = { success: true, data: result };

    if (kv) {
      await kv.put(CENTER_CYCLES_CACHE_KEY, JSON.stringify(responsePayload), { expirationTtl: 120 });
    }

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ["ADMIN", "STORE_CENTER"]);
    if (!auth.ok) return auth.response;

    const env = getCloudflareContext().env;
    const db = getDb(env as any);

    const body = (await req.json()) as any;
    const { project_ids, start_date, end_date, target_months } = body;

    if (!project_ids || !project_ids.length || !start_date || !end_date || !target_months) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const cycleCount = await db.select().from(planning_cycles).execute();
    const cycleNum = `CYCLE-${(cycleCount.length + 1).toString().padStart(3, '0')}`;

    const newCycleResult = await db.insert(planning_cycles).values({
      cycle_number: cycleNum,
      start_date,
      end_date,
      target_months: JSON.stringify(target_months),
      created_by: auth.payload.id,
    }).returning();
    
    const newCycle = newCycleResult[0];

    const jobsToInsert = project_ids.map((pid: string) => ({
      cycle_id: newCycle.id,
      project_id: pid,
      job_number: `PJ-${pid}-${newCycle.id}`,
      status: "OPEN" as const,
    }));

    for (const job of jobsToInsert) {
      await db.insert(planning_jobs).values(job);
    }

    await invalidateCache((env as any).CACHE_KV);

    return NextResponse.json({ success: true, data: newCycle });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
