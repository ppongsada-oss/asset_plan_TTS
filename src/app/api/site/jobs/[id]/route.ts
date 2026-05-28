import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { planning_jobs, planning_cycles } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "edge";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const jobId = parseInt(id);
    const env = getRequestContext().env;
    const db = getDb(env as any);
    
    const job = await db.select({
      id: planning_jobs.id,
      project_id: planning_jobs.project_id,
      job_number: planning_jobs.job_number,
      status: planning_jobs.status,
      is_unlocked: planning_jobs.is_unlocked,
      cycle_id: planning_jobs.cycle_id,
      cycle_number: planning_cycles.cycle_number,
      target_months: planning_cycles.target_months,
    })
    .from(planning_jobs)
    .innerJoin(planning_cycles, eq(planning_jobs.cycle_id, planning_cycles.id))
    .where(eq(planning_jobs.id, jobId))
    .get();

    if (!job) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: job });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const jobId = parseInt(id);
    const env = getRequestContext().env;
    const db = getDb(env as any);
    
    const body = (await req.json()) as any;
    const { status } = body; 

    if (status !== "SUBMITTED" && status !== "OPEN") {
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
    }

    await db.update(planning_jobs).set({ status }).where(eq(planning_jobs.id, jobId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
