import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { planning_jobs, planning_cycles, project_plans, planning_logs, center_decisions, project_inventory } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireRole } from "@/lib/auth-check";
import { invalidateCache } from "@/lib/cache";


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(req, ["ADMIN", "STORE_CENTER"]);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const cycleId = parseInt(id);
    const env = getCloudflareContext().env;
    const db = getDb(env as any);

    const body = (await req.json()) as any;
    const { project_ids } = body; 

    const existingJobs = await db.select().from(planning_jobs).where(eq(planning_jobs.cycle_id, cycleId));
    
    const projectsToRemove = existingJobs.filter(job => !project_ids.includes(job.project_id));
    
    for (const job of projectsToRemove) {
      if (job.status === "APPROVED") {
        return NextResponse.json({ 
          success: false, 
          error: `ไม่สามารถลบโครงการ ${job.project_id} ได้เนื่องจากสถานะเป็น APPROVED แล้ว` 
        }, { status: 400 });
      }
    }

    for (const job of projectsToRemove) {
      // Cascading delete for individual job removal
      const jobPlans = await db.select().from(project_plans).where(eq(project_plans.job_id, job.id));
      const planIds = jobPlans.map(p => p.id);
      
      if (planIds.length > 0) {
        await db.delete(center_decisions).where(inArray(center_decisions.plan_id, planIds));
        await db.delete(project_plans).where(eq(project_plans.job_id, job.id));
      }
      await db.delete(planning_logs).where(eq(planning_logs.job_id, job.id));
      await db.delete(planning_jobs).where(eq(planning_jobs.id, job.id));
    }

    const existingProjectIds = existingJobs.map(j => j.project_id);
    const projectsToAdd = project_ids.filter((pid: string) => !existingProjectIds.includes(pid));
    
    if (projectsToAdd.length > 0) {
      const jobsToInsert = projectsToAdd.map((pid: string) => ({
        cycle_id: cycleId,
        project_id: pid,
        job_number: `PJ-${pid}-${cycleId}`,
        status: "OPEN" as const,
      }));
      for (const job of jobsToInsert) {
        await db.insert(planning_jobs).values(job);
      }
    }

    await invalidateCache((env as any).CACHE_KV, cycleId);

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
    const cycleId = parseInt(id);
    const env = getCloudflareContext().env;
    const db = getDb(env as any);

    // 2. Check for any APPROVED jobs in this cycle
    const jobs = await db.select().from(planning_jobs).where(eq(planning_jobs.cycle_id, cycleId));
    const hasApproved = jobs.some(j => j.status === "APPROVED");

    if (hasApproved) {
      return NextResponse.json({ 
        success: false, 
        error: "ไม่สามารถลบงวดงานได้เนื่องจากมีบางโครงการได้รับการอนุมัติ (APPROVED) แล้ว" 
      }, { status: 400 });
    }

    // 3. Cascading Delete
    for (const job of jobs) {
      const jobPlans = await db.select().from(project_plans).where(eq(project_plans.job_id, job.id));
      const planIds = jobPlans.map(p => p.id);
      
      if (planIds.length > 0) {
        await db.delete(center_decisions).where(inArray(center_decisions.plan_id, planIds));
        await db.delete(project_plans).where(eq(project_plans.job_id, job.id));
      }
      await db.delete(planning_logs).where(eq(planning_logs.job_id, job.id));
      await db.delete(planning_jobs).where(eq(planning_jobs.id, job.id));
    }

    // Delete associated project inventory records for this cycle
    await db.delete(project_inventory).where(eq(project_inventory.cycle_id, cycleId));

    // Finally delete the cycle
    await db.delete(planning_cycles).where(eq(planning_cycles.id, cycleId));

    await invalidateCache((env as any).CACHE_KV, cycleId);

    return NextResponse.json({ success: true, message: "Cycle deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
