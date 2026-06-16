import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { planning_jobs, project_plans, planning_logs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { invalidateCache } from "@/lib/cache";
import { requireProject } from "@/lib/auth-check";


export async function POST(req: NextRequest) {
  try {
    const env = getCloudflareContext().env;
    const db = getDb(env as any);

    const { job_id, notes } = await req.json() as any;
    if (!job_id) return NextResponse.json({ success: false, error: "Missing job_id" }, { status: 400 });

    const jobIdInt = typeof job_id === "string" ? parseInt(job_id) : job_id;

    const job = await db.select({
      cycle_id: planning_jobs.cycle_id,
      project_id: planning_jobs.project_id,
    })
      .from(planning_jobs)
      .where(eq(planning_jobs.id, jobIdInt))
      .get();
    if (!job) return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });

    const auth = await requireProject(req, job.project_id, ["PROJECT_MANAGER"]);
    if (!auth.ok) return auth.response;

    // 1. Update Job Status to REJECTED so Site knows it was sent back
    await db.update(planning_jobs)
      .set({ status: "REJECTED" })
      .where(eq(planning_jobs.id, jobIdInt));

    // 2. Update individual plan statuses to REJECTED
    await db.update(project_plans)
      .set({ status: "REJECTED" })
      .where(eq(project_plans.job_id, jobIdInt));

    // 3. Log action
    await db.insert(planning_logs).values({
      job_id: jobIdInt,
      action: "PM_REJECT",
      details: JSON.stringify({ notes: notes || "No notes provided" }),
      user_id: auth.payload.id,
    });

    // 4. Invalidate Cache (scoped to cycle)
    const kv = (env as any).CACHE_KV;
    if (kv) {
      await invalidateCache(kv, job?.cycle_id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
