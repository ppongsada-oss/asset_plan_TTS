import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { planning_jobs, project_plans } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "@/lib/auth-check";
import { invalidateCache } from "@/lib/cache";


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(req, ["ADMIN", "STORE_CENTER"]);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const jobId = parseInt(id);
    const env = getCloudflareContext().env;
    const db = getDb(env as any);

    const body = (await req.json()) as any;
    const { is_unlocked } = body;

    if (typeof is_unlocked !== "number" || (is_unlocked !== 0 && is_unlocked !== 1)) {
      return NextResponse.json({ success: false, error: "is_unlocked must be 0 or 1" }, { status: 400 });
    }

    const currentJob = await db.select({ cycle_id: planning_jobs.cycle_id })
      .from(planning_jobs)
      .where(eq(planning_jobs.id, jobId))
      .get();

    await db.update(planning_jobs)
      .set({ is_unlocked, updated_at: new Date().toISOString().slice(0, 19).replace("T", " ") })
      .where(eq(planning_jobs.id, jobId));

    await invalidateCache((env as any).CACHE_KV, currentJob?.cycle_id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}


export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(req, ["ADMIN", "STORE_CENTER"]);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const jobId = parseInt(id);
    const env = getCloudflareContext().env;
    const db = getDb(env as any);

    // 2. Check job status
    const job = await db.select().from(planning_jobs).where(eq(planning_jobs.id, jobId)).get();
    if (!job) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    if (job.status === "APPROVED") {
      return NextResponse.json({ 
        success: false, 
        error: "ไม่สามารถยกเลิกใบงานได้เนื่องจากสถานะเป็น APPROVED แล้ว" 
      }, { status: 400 });
    }

    // 3. Delete job and related data
    // We should also delete related project_plans to clean up
    await db.delete(project_plans).where(eq(project_plans.job_id, jobId));
    await db.delete(planning_jobs).where(eq(planning_jobs.id, jobId));

    await invalidateCache((env as any).CACHE_KV, job.cycle_id);

    return NextResponse.json({ success: true, message: "Job cancelled successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
