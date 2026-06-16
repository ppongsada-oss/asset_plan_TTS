import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { planning_jobs, project_plans, planning_logs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { invalidateCache } from "@/lib/cache";
import { requireProject } from "@/lib/auth-check";


export async function POST(req: NextRequest) {
  try {
    const env = getCloudflareContext().env;
    const db = getDb(env as any);

    const { job_id } = await req.json() as any;
    if (!job_id) return NextResponse.json({ success: false, error: "Missing job_id" }, { status: 400 });

    const job = await db.select({
      cycle_id: planning_jobs.cycle_id,
      project_id: planning_jobs.project_id,
    })
      .from(planning_jobs)
      .where(eq(planning_jobs.id, job_id))
      .get();
    if (!job) return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });

    const auth = await requireProject(req, job.project_id, ["PROJECT_MANAGER"]);
    if (!auth.ok) return auth.response;

    // Update Job Status
    await db.update(planning_jobs)
      .set({ status: "APPROVED" })
      .where(eq(planning_jobs.id, job_id));

    // Update individual plan statuses (optional, but good for consistency)
    await db.update(project_plans)
      .set({ status: "APPROVED", approved_by: auth.payload.id })
      .where(eq(project_plans.job_id, job_id));

    // Log action
    await db.insert(planning_logs).values({
      job_id,
      action: "PM_APPROVE",
      details: "Approved by PM",
      user_id: auth.payload.id,
    });

    // 4. Invalidate Matrix Report Cache (scoped to cycle)
    const kv = (env as any).CACHE_KV;
    if (kv) {
      await invalidateCache(kv, job?.cycle_id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
