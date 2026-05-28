import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { center_decisions, project_plans, equipment_items, planning_jobs } from "@/db/schema";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { eq, sql, and, inArray } from "drizzle-orm";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { invalidateCache } from "@/lib/cache";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const env = getRequestContext().env;
    const db = getDb(env as any);
    const body = (await request.json()) as any;
    
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    let userId = null;
    if (token) {
      try {
        const payload = await verifyToken(token) as any;
        if (payload) userId = payload.userId;
      } catch(e) {}
    }

    if (!body.plan_id || !body.action_type) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // A. Promote virtual plan to real plan in project_plans if needed
    let planId = body.plan_id;
    if (typeof planId === "string" && planId.startsWith("v-")) {
      const parts = planId.split("-");
      const eqIdStr = parts[parts.length - 1];
      const eqId = parseInt(eqIdStr);
      const projId = parts.slice(1, parts.length - 1).join("-");

      if (isNaN(eqId) || !projId) {
        return NextResponse.json({ success: false, error: "Invalid virtual plan ID" }, { status: 400 });
      }

      const cycleId = body.cycle_id ? parseInt(body.cycle_id) : null;
      const month = body.month || "2026-05";

      // Find or create planning_job
      let jobId = null;
      if (cycleId) {
        const job = await db.select()
          .from(planning_jobs)
          .where(
            and(
              eq(planning_jobs.project_id, projId),
              eq(planning_jobs.cycle_id, cycleId)
            )
          )
          .limit(1);
        if (job.length > 0) {
          jobId = job[0].id;
        } else {
          const newJob = await db.insert(planning_jobs).values({
            project_id: projId,
            cycle_id: cycleId,
            status: "APPROVED"
          }).returning({ id: planning_jobs.id });
          if (newJob.length > 0) {
            jobId = newJob[0].id;
          }
        }
      }

      // Create new project_plan record
      const newPlan = await db.insert(project_plans).values({
        project_id: projId,
        equipment_id: eqId,
        month: month,
        required_qty: 0,
        status: "APPROVED",
        job_id: jobId,
        created_by: userId,
        approved_by: userId
      }).returning({ id: project_plans.id });

      if (newPlan.length === 0) {
        return NextResponse.json({ success: false, error: "Failed to promote virtual plan" }, { status: 500 });
      }

      planId = newPlan[0].id;
      body.plan_id = planId;
    } else if (typeof planId === "string") {
      planId = parseInt(planId);
      body.plan_id = planId;
    }

    const actionQty = body.qty || 0;

    // 1. Insert Decision
    await db.insert(center_decisions).values({
      plan_id: body.plan_id,
      action_type: body.action_type,
      qty: actionQty,
      notes: body.notes || "",
      action_by: userId,
    });

    // 2. Fetch all decisions for this plan to check total fulfillment
    const decisions = await db.select().from(center_decisions).where(eq(center_decisions.plan_id, body.plan_id));
    const totalFulfilled = decisions.reduce((sum, d) => sum + (d.qty || 0), 0);

    // 3. Update Plan Status if totalFulfilled >= totalDelta
    if (totalFulfilled >= (body.total_qty || 0)) {
      await db.update(project_plans)
        .set({ status: "PROCURED" })
        .where(eq(project_plans.id, body.plan_id));
    }

    // 4. Stock and Plan adjustments based on action type
    if (body.action_type === "DISPATCH") {
      const plan = await db.select().from(project_plans).where(eq(project_plans.id, body.plan_id)).limit(1);
      if (plan.length > 0 && actionQty > 0) {
        console.log(`[POST Decision] Dispatching ${actionQty} for Equipment ID: ${plan[0].equipment_id}`);
        await db.update(equipment_items)
          .set({ remaining_stock: sql`remaining_stock - ${actionQty}` })
          .where(eq(equipment_items.id, plan[0].equipment_id));
      }
    } else if (body.action_type === "RECEIVE") {
      const plan = await db.select().from(project_plans).where(eq(project_plans.id, body.plan_id)).limit(1);
      if (plan.length > 0 && actionQty > 0) {
        console.log(`[POST Decision] Receiving ${actionQty} for Equipment ID: ${plan[0].equipment_id}`);
        await db.update(equipment_items)
          .set({ remaining_stock: sql`remaining_stock + ${actionQty}` })
          .where(eq(equipment_items.id, plan[0].equipment_id));
      }
    } else if (body.action_type === "REJECT_RETURN") {
      if (actionQty > 0) {
        // Fetch target plan details to find future months
        const targetPlan = await db.select().from(project_plans).where(eq(project_plans.id, body.plan_id)).limit(1);
        if (targetPlan.length > 0) {
          const p = targetPlan[0];
          
          const whereConds = [
            eq(project_plans.project_id, p.project_id),
            eq(project_plans.equipment_id, p.equipment_id),
            sql`${project_plans.month} >= ${p.month}`
          ];
          
          if (p.job_id) {
            const currentJob = await db.select().from(planning_jobs).where(eq(planning_jobs.id, p.job_id)).limit(1);
            if (currentJob.length > 0) {
              const cycleJobs = await db.select({ id: planning_jobs.id })
                .from(planning_jobs)
                .where(eq(planning_jobs.cycle_id, currentJob[0].cycle_id));
              const cycleJobIds = cycleJobs.map((cj: any) => cj.id);
              if (cycleJobIds.length > 0) {
                whereConds.push(inArray(project_plans.job_id, cycleJobIds));
              }
            }
          }

          // Propagate requirement increase to current and all future months for this site/item
          await db.update(project_plans)
            .set({ required_qty: sql`${project_plans.required_qty} + ${actionQty}` })
            .where(and(...whereConds));
          console.log(`[POST Decision] REJECT_RETURN: Propagated +${actionQty} to ${p.project_id}/${p.equipment_id} starting ${p.month}`);
        }
      }
    }

    // 5. Invalidate Matrix Report Cache
    const kv = (env as any).CACHE_KV;
    if (kv) {
      await invalidateCache(kv);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST Center Decision Error:", error);
    return NextResponse.json({ success: false, error: "Failed to save decision" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const env = getRequestContext().env;
    const db = getDb(env as any);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });

    const decisionId = parseInt(id);
    
    // 1. Fetch decision to check type and plan_id
    const decision = await db.select().from(center_decisions).where(eq(center_decisions.id, decisionId)).limit(1);
    if (decision.length === 0) return NextResponse.json({ success: false, error: "Decision not found" }, { status: 404 });

    const d = decision[0];

    // 2. Revert stock or plan adjustments
    if (d.action_type === "DISPATCH") {
      const plan = await db.select().from(project_plans).where(eq(project_plans.id, d.plan_id)).limit(1);
      if (plan.length > 0) {
        await db.update(equipment_items)
          .set({ remaining_stock: sql`${equipment_items.remaining_stock} + ${d.qty}` })
          .where(eq(equipment_items.id, plan[0].equipment_id));
      }
    } else if (d.action_type === "RECEIVE") {
      const plan = await db.select().from(project_plans).where(eq(project_plans.id, d.plan_id)).limit(1);
      if (plan.length > 0) {
        await db.update(equipment_items)
          .set({ remaining_stock: sql`${equipment_items.remaining_stock} - ${d.qty}` })
          .where(eq(equipment_items.id, plan[0].equipment_id));
      }
    } else if (d.action_type === "REJECT_RETURN") {
      // Fetch plan details to revert propagation
      const targetPlan = await db.select().from(project_plans).where(eq(project_plans.id, d.plan_id)).limit(1);
      if (targetPlan.length > 0) {
        const p = targetPlan[0];
        
        const whereConds = [
          eq(project_plans.project_id, p.project_id),
          eq(project_plans.equipment_id, p.equipment_id),
          sql`${project_plans.month} >= ${p.month}`
        ];
        
        if (p.job_id) {
          const currentJob = await db.select().from(planning_jobs).where(eq(planning_jobs.id, p.job_id)).limit(1);
          if (currentJob.length > 0) {
            const cycleJobs = await db.select({ id: planning_jobs.id })
              .from(planning_jobs)
              .where(eq(planning_jobs.cycle_id, currentJob[0].cycle_id));
            const cycleJobIds = cycleJobs.map((cj: any) => cj.id);
            if (cycleJobIds.length > 0) {
              whereConds.push(inArray(project_plans.job_id, cycleJobIds));
            }
          }
        }

        await db.update(project_plans)
          .set({ required_qty: sql`${project_plans.required_qty} - ${d.qty}` })
          .where(and(...whereConds));
        console.log(`[DELETE Decision] REJECT_RETURN Revert: Propagated -${d.qty} to ${p.project_id}/${p.equipment_id} starting ${p.month}`);
      }
    }

    // 3. Delete Decision
    await db.delete(center_decisions).where(eq(center_decisions.id, decisionId));

    // 4. Re-calculate and Update Plan Status
    // Fetch remaining decisions for this plan
    const remainingDecisions = await db.select().from(center_decisions).where(eq(center_decisions.plan_id, d.plan_id));
    const currentFulfilled = remainingDecisions.reduce((sum, rd) => sum + (rd.qty || 0), 0);
    
    // We need to know the total required qty to decide if it's still PROCURED or should be APPROVED
    const planRecords = await db.select().from(project_plans).where(eq(project_plans.id, d.plan_id)).limit(1);
    if (planRecords.length > 0) {
      const plan = planRecords[0];
      // For Demand items, we check against qty. For returns, usually they stay APPROVED until fully received? 
      // Actually, the simplest is: if currentFulfilled < required_qty, set to APPROVED.
      if (currentFulfilled < plan.required_qty) {
        await db.update(project_plans)
          .set({ status: "APPROVED" })
          .where(eq(project_plans.id, d.plan_id));
      }
    }

    // 5. Invalidate Matrix Report Cache
    const kv = (env as any).CACHE_KV;
    if (kv) {
      await invalidateCache(kv);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE Center Decision Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || "Failed to delete decision" 
    }, { status: 500 });
  }
}
