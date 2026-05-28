import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { project_plans, planning_jobs, planning_cycles, project_inventory } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { invalidateCache } from "@/lib/cache";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const env = getRequestContext().env;
    const db = getDb(env as any);
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("job_id");

    if (!jobId) {
      return NextResponse.json({ success: false, error: "Missing job_id" }, { status: 400 });
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

    let previousMonthData: any[] = [];
    let inventoryData: any[] = [];

    if (currentJob) {
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

          const latestMap = new Map();
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
      } catch (e) {
        console.error("Error calculating previous month:", e);
      }
    }

    const plans = await db.select().from(project_plans).where(eq(project_plans.job_id, parseInt(jobId)));
    return NextResponse.json({ 
      success: true, 
      data: plans,
      previous_month_plans: previousMonthData,
      inventory: inventoryData
    });
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

    const body = (await req.json()) as any;
    const { job_id, project_id, plans } = body; // plans expected to be array of objects: { equipment_id, month, required_qty }

    if (!job_id || !project_id || !plans) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Replace all plans for this job
    await db.delete(project_plans).where(eq(project_plans.job_id, job_id));

    if (plans.length > 0) {
      const insertData = plans.map((p: any) => ({
        job_id,
        project_id,
        equipment_id: p.equipment_id,
        month: p.month,
        required_qty: p.required_qty,
        created_by: payload.id,
      }));
      for (const plan of insertData) {
        await db.insert(project_plans).values(plan);
      }
    }

    // 3. Invalidate Matrix Report Cache
    const kv = (env as any).CACHE_KV;
    if (kv) {
      await invalidateCache(kv);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
