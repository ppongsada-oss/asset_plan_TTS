import { NextRequest, NextResponse } from "next/server";
import { getDb, type Env } from "@/db";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { planning_jobs, planning_cycles, project_plans, center_decisions, equipment_items } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireProject } from "@/lib/auth-check";
import { getSiteJobDetailCacheKey, invalidateCache } from "@/lib/cache";

type SiteJobStatusBody = {
  status?: "SUBMITTED" | "OPEN" | "DRAFT";
};


export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const jobId = parseInt(id);
    const env = getCloudflareContext().env as Env;
    const db = getDb(env);
    const cacheKey = getSiteJobDetailCacheKey(jobId);
    const cached = await env.CACHE_KV?.get(cacheKey, "json") as { success: true; data: unknown } | null;
    if (cached) {
      return NextResponse.json(cached);
    }
    
    const job = await db.select({
      id: planning_jobs.id,
      project_id: planning_jobs.project_id,
      job_number: planning_jobs.job_number,
      status: planning_jobs.status,
      edit_requested: planning_jobs.edit_requested,
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

    const auth = await requireProject(req, job.project_id);
    if (!auth.ok) return auth.response;

    const centerActionRows = await db.select({
      equipment_name: equipment_items.name,
    })
      .from(center_decisions)
      .innerJoin(project_plans, eq(center_decisions.plan_id, project_plans.id))
      .innerJoin(equipment_items, eq(project_plans.equipment_id, equipment_items.id))
      .where(eq(project_plans.job_id, jobId));

    const lockedEditItems = Array.from(new Set(
      centerActionRows
        .map((row) => row.equipment_name)
        .filter((name): name is string => typeof name === "string" && name.length > 0)
    ));

    const jobWithEditLock = {
      ...job,
      has_center_actions: centerActionRows.length > 0,
      locked_edit_items: lockedEditItems,
    };

    const payloadResponse = { success: true, data: jobWithEditLock };
    await env.CACHE_KV?.put(cacheKey, JSON.stringify(payloadResponse), { expirationTtl: 120 });
    return NextResponse.json(payloadResponse);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const jobId = parseInt(id);
    const env = getCloudflareContext().env as Env;
    const db = getDb(env);
    
    const body = (await req.json()) as SiteJobStatusBody;
    const { status } = body; 

    if (status !== "SUBMITTED" && status !== "OPEN" && status !== "DRAFT") {
      return NextResponse.json({ success: false, error: "Invalid status" }, { status: 400 });
    }

    const job = await db.select({ project_id: planning_jobs.project_id, cycle_id: planning_jobs.cycle_id })
      .from(planning_jobs)
      .where(eq(planning_jobs.id, jobId))
      .get();
    if (!job) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    const auth = await requireProject(req, job.project_id, ["STORE_SITE"]);
    if (!auth.ok) return auth.response;

    await db.update(planning_jobs).set({
      status: status as unknown as "OPEN" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CLOSED"
    }).where(eq(planning_jobs.id, jobId));
    await invalidateCache(env.CACHE_KV, job.cycle_id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
