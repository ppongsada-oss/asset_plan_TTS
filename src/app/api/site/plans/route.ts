import { NextRequest, NextResponse } from "next/server";
import { getDb, type Env } from "@/db";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { project_plans, planning_jobs, planning_cycles, project_inventory } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getSitePlansCacheKey, invalidateCache } from "@/lib/cache";
import { requireProject } from "@/lib/auth-check";

type SitePlanInput = {
  equipment_id: number;
  month: string;
  required_qty: number;
};

type SitePlanRequestBody = {
  job_id?: number;
  project_id?: string;
  plans?: SitePlanInput[];
};

type ExistingPlanSnapshot = {
  project_id: string;
  equipment_id: number;
  month: string;
  required_qty: number;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "PROCURED";
  job_id: number | null;
  created_by: number | null;
  approved_by: number | null;
};

export type NewPlanSnapshot = {
  job_id: number;
  project_id: string;
  equipment_id: number;
  month: string;
  required_qty: number;
  status: ExistingPlanSnapshot["status"];
  created_by: number;
};

type ReplacePlansWithRollbackArgs = {
  existingPlans: ExistingPlanSnapshot[];
  nextPlans: NewPlanSnapshot[];
  clearPlans: () => Promise<unknown>;
  insertPlan: (plan: NewPlanSnapshot) => Promise<unknown>;
  restorePlan: (plan: ExistingPlanSnapshot) => Promise<unknown>;
};

const isValidPlanInput = (plan: unknown): plan is SitePlanInput => {
  if (!plan || typeof plan !== "object") return false;

  const candidate = plan as Partial<SitePlanInput>;
  return (
    typeof candidate.equipment_id === "number" &&
    Number.isInteger(candidate.equipment_id) &&
    typeof candidate.month === "string" &&
    candidate.month.length > 0 &&
    typeof candidate.required_qty === "number" &&
    Number.isInteger(candidate.required_qty) &&
    candidate.required_qty >= 0
  );
};

export async function replacePlansWithRollback({
  existingPlans,
  nextPlans,
  clearPlans,
  insertPlan,
  restorePlan,
}: ReplacePlansWithRollbackArgs) {
  try {
    await clearPlans();

    for (const plan of nextPlans) {
      await insertPlan(plan);
    }
  } catch (error) {
    await clearPlans();

    for (const originalPlan of existingPlans) {
      await restorePlan(originalPlan);
    }

    throw error;
  }
}

export async function GET(req: NextRequest) {
  try {
    const env = getCloudflareContext().env as Env;
    const db = getDb(env);
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("job_id");

    if (!jobId) {
      return NextResponse.json({ success: false, error: "Missing job_id" }, { status: 400 });
    }

    const cacheKey = getSitePlansCacheKey(parseInt(jobId));
    const cached = await env.CACHE_KV?.get(cacheKey, "json") as {
      success: true;
      data: unknown[];
      previous_month_plans: unknown[];
      inventory: unknown[];
    } | null;
    if (cached) {
      return NextResponse.json(cached);
    }

    const currentJob = await db.select({
      project_id: planning_jobs.project_id,
      cycle_id: planning_jobs.cycle_id,
      target_months: planning_cycles.target_months
    })
    .from(planning_jobs)
    .innerJoin(planning_cycles, eq(planning_jobs.cycle_id, planning_cycles.id))
    .where(eq(planning_jobs.id, parseInt(jobId)))
    .get();
    if (!currentJob) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    const auth = await requireProject(req, currentJob.project_id);
    if (!auth.ok) return auth.response;

    let previousMonthData: Array<{ equipment_id: number; required_qty: number }> = [];
    let inventoryData: Array<{ equipment_id: number; qty: number }> = [];

    // 1. Fetch Actual Inventory (Remaining Stock)
    inventoryData = await db.select({
      equipment_id: project_inventory.equipment_id,
      qty: project_inventory.qty
    })
    .from(project_inventory)
    .where(and(
      eq(project_inventory.project_id, currentJob.project_id),
      eq(project_inventory.cycle_id, currentJob.cycle_id)
    ));

    try {
      const months = JSON.parse(currentJob.target_months);
      if (months.length > 0) {
        const firstMonth = months[0];
        previousMonthData = await db.select({
          equipment_id: project_plans.equipment_id,
          required_qty: project_plans.required_qty,
          month: project_plans.month
        })
        .from(project_plans)
        .innerJoin(planning_jobs, eq(project_plans.job_id, planning_jobs.id))
        .where(and(
          eq(planning_jobs.project_id, currentJob.project_id),
          sql`${project_plans.month} < ${firstMonth}`,
          eq(planning_jobs.status, "APPROVED")
        ))
        .orderBy(desc(project_plans.month))
        .all();

        const latestMap = new Map<number, number>();
        previousMonthData.forEach(p => {
          if (!latestMap.has(p.equipment_id)) {
            latestMap.set(p.equipment_id, p.required_qty);
          }
        });

        previousMonthData = Array.from(latestMap.entries()).map(([id, qty]) => ({
          equipment_id: id,
          required_qty: qty
        }));
      }
    } catch (error: unknown) {
      console.error("Error calculating previous month:", error);
    }

    const plans = await db.select().from(project_plans).where(eq(project_plans.job_id, parseInt(jobId)));
    const payloadResponse = { 
      success: true, 
      data: plans,
      previous_month_plans: previousMonthData,
      inventory: inventoryData
    };
    await env.CACHE_KV?.put(cacheKey, JSON.stringify(payloadResponse), { expirationTtl: 120 });
    return NextResponse.json(payloadResponse);
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const env = getCloudflareContext().env as Env;
    const db = getDb(env);

    const body = (await req.json()) as SitePlanRequestBody;
    const { job_id, project_id, plans } = body; // plans expected to be array of objects: { equipment_id, month, required_qty }

    if (!job_id || !project_id || !Array.isArray(plans)) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }
    if (!plans.every(isValidPlanInput)) {
      return NextResponse.json({ success: false, error: "Invalid plan payload" }, { status: 400 });
    }

    // Get job status and cycle_id (for scoped cache invalidation)
    const currentJob = await db.select({
      status: planning_jobs.status,
      cycle_id: planning_jobs.cycle_id,
      project_id: planning_jobs.project_id
    })
      .from(planning_jobs)
      .where(eq(planning_jobs.id, job_id))
      .get();
    if (!currentJob) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }
    if (currentJob.project_id !== project_id) {
      return NextResponse.json({ success: false, error: "Project mismatch" }, { status: 400 });
    }

    const auth = await requireProject(req, currentJob.project_id, ["STORE_SITE"]);
    if (!auth.ok) return auth.response;
    
    const planStatus = (currentJob?.status === "APPROVED" || currentJob?.status === "CLOSED") ? "APPROVED" : "DRAFT";

    const existingPlans = await db.select({
      project_id: project_plans.project_id,
      equipment_id: project_plans.equipment_id,
      month: project_plans.month,
      required_qty: project_plans.required_qty,
      status: project_plans.status,
      job_id: project_plans.job_id,
      created_by: project_plans.created_by,
      approved_by: project_plans.approved_by,
    })
      .from(project_plans)
      .where(eq(project_plans.job_id, job_id));

    const insertData: NewPlanSnapshot[] = plans.map((plan) => ({
      job_id,
      project_id,
      equipment_id: plan.equipment_id,
      month: plan.month,
      required_qty: plan.required_qty,
      status: planStatus,
      created_by: auth.payload.id,
    }));

    await replacePlansWithRollback({
      existingPlans: existingPlans as ExistingPlanSnapshot[],
      nextPlans: insertData,
      clearPlans: () => db.delete(project_plans).where(eq(project_plans.job_id, job_id)),
      insertPlan: (plan) => db.insert(project_plans).values(plan),
      restorePlan: (plan) => db.insert(project_plans).values(plan),
    });

    // 3. Invalidate Matrix Report Cache (scoped to cycle)
    const kv = (env as Env & { CACHE_KV?: KVNamespace }).CACHE_KV;
    if (kv) {
      await invalidateCache(kv, currentJob?.cycle_id);
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
