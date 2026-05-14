import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { planning_cycles, planning_jobs } from "@/db/schema";
import { desc } from "drizzle-orm";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const env = getRequestContext().env;
    const db = getDb(env as any);
    
    const cycles = await db.select().from(planning_cycles).orderBy(desc(planning_cycles.created_at));
    const jobs = await db.select().from(planning_jobs);
    
    const result = cycles.map(cycle => ({
      ...cycle,
      jobs: jobs.filter(j => j.cycle_id === cycle.id)
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const env = getRequestContext().env;
    const db = getDb(env as any);
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const payload = await verifyToken(token) as any;
    
    if (payload.role !== "ADMIN" && payload.role !== "STORE_CENTER") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

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
      created_by: payload.id,
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

    return NextResponse.json({ success: true, data: newCycle });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
