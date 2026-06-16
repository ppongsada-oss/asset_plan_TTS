import { NextRequest, NextResponse } from "next/server";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getDb } from "@/db";
import { center_decisions, project_plans, equipment_items, planning_jobs } from "@/db/schema";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, sql, and, inArray } from "drizzle-orm";
import { invalidateCache } from "@/lib/cache";
import { requireRole } from "@/lib/auth-check";

type DecisionAction =
  | "DISPATCH"
  | "CIRCULATE"
  | "SUBSTITUTE"
  | "BUY"
  | "RENT"
  | "RECEIVE"
  | "REJECT_RETURN";

type DecisionBody = {
  plan_id?: number | string;
  decision_id?: number | string;
  action_type?: DecisionAction;
  qty?: number | string;
  notes?: string;
  total_qty?: number | string;
  cycle_id?: number | string;
  month?: string;
  ids?: Array<number | string>;
};

type DecisionRow = {
  qty: number | null;
};

async function getPlanById(db: any, planId: number) {
  const plans = await db.select().from(project_plans).where(eq(project_plans.id, planId)).limit(1);
  return plans[0] ?? null;
}

async function getCycleIdFromPlan(db: any, plan: any) {
  if (!plan?.job_id) return null;
  const jobs = await db.select({ cycle_id: planning_jobs.cycle_id }).from(planning_jobs).where(eq(planning_jobs.id, plan.job_id)).limit(1);
  return jobs[0]?.cycle_id ?? null;
}

async function getPropagationWhereConds(db: any, plan: any) {
  const whereConds: any[] = [
    eq(project_plans.project_id, plan.project_id),
    eq(project_plans.equipment_id, plan.equipment_id),
    sql`${project_plans.month} >= ${plan.month}`
  ];

  if (plan.job_id) {
    const currentJob = await db.select().from(planning_jobs).where(eq(planning_jobs.id, plan.job_id)).limit(1);
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

  return whereConds;
}

async function applyDecisionEffect(db: any, plan: any, actionType: DecisionAction, qty: number) {
  if (!plan || qty <= 0) return;

  if (actionType === "DISPATCH") {
    await db.update(equipment_items)
      .set({ remaining_stock: sql`${equipment_items.remaining_stock} - ${qty}` })
      .where(eq(equipment_items.id, plan.equipment_id));
    return;
  }

  if (actionType === "RECEIVE") {
    await db.update(equipment_items)
      .set({ remaining_stock: sql`${equipment_items.remaining_stock} + ${qty}` })
      .where(eq(equipment_items.id, plan.equipment_id));
    return;
  }

  if (actionType === "REJECT_RETURN") {
    const whereConds = await getPropagationWhereConds(db, plan);
    await db.update(project_plans)
      .set({ required_qty: sql`${project_plans.required_qty} + ${qty}` })
      .where(and(...whereConds));
  }
}

async function revertDecisionEffect(db: any, plan: any, actionType: DecisionAction, qty: number) {
  if (!plan || qty <= 0) return;

  if (actionType === "DISPATCH") {
    await db.update(equipment_items)
      .set({ remaining_stock: sql`${equipment_items.remaining_stock} + ${qty}` })
      .where(eq(equipment_items.id, plan.equipment_id));
    return;
  }

  if (actionType === "RECEIVE") {
    await db.update(equipment_items)
      .set({ remaining_stock: sql`${equipment_items.remaining_stock} - ${qty}` })
      .where(eq(equipment_items.id, plan.equipment_id));
    return;
  }

  if (actionType === "REJECT_RETURN") {
    const whereConds = await getPropagationWhereConds(db, plan);
    await db.update(project_plans)
      .set({ required_qty: sql`${project_plans.required_qty} - ${qty}` })
      .where(and(...whereConds));
  }
}

async function recalcPlanStatus(db: any, planId: number, totalQty?: number) {
  const remainingDecisions = await db.select().from(center_decisions).where(eq(center_decisions.plan_id, planId));
  const currentFulfilled = (remainingDecisions as DecisionRow[]).reduce((sum: number, rd: DecisionRow) => sum + (rd.qty || 0), 0);
  const plan = await getPlanById(db, planId);

  if (!plan) return;

  const threshold = typeof totalQty === "number" && Number.isFinite(totalQty)
    ? totalQty
    : plan.required_qty;

  await db.update(project_plans)
    .set({ status: currentFulfilled >= threshold ? "PROCURED" : "APPROVED" })
    .where(eq(project_plans.id, planId));
}

async function invalidateDecisionCaches(env: any, cycleIds: Set<number>) {
  const kv = env.CACHE_KV;
  if (!kv) return;

  if (cycleIds.size === 0) {
    await invalidateCache(kv);
    return;
  }

  for (const cycleId of cycleIds) {
    await invalidateCache(kv, cycleId);
  }
}

async function promoteVirtualPlanIfNeeded(db: any, body: any, userId: number | null) {
  let planId = body.plan_id;

  if (typeof planId === "string" && planId.startsWith("v-")) {
    const parts = planId.split("-");
    const eqIdStr = parts[parts.length - 1];
    const eqId = parseInt(eqIdStr, 10);
    const projId = parts.slice(1, parts.length - 1).join("-");

    if (isNaN(eqId) || !projId) {
      throw new Error("Invalid virtual plan ID");
    }

    const cycleId = body.cycle_id ? parseInt(body.cycle_id, 10) : null;
    const month = body.month || "2026-05";

    let jobId = null;
    if (cycleId) {
      const job = await db.select()
        .from(planning_jobs)
        .where(and(eq(planning_jobs.project_id, projId), eq(planning_jobs.cycle_id, cycleId)))
        .limit(1);

      if (job.length > 0) {
        jobId = job[0].id;
      } else {
        const newJob = await db.insert(planning_jobs).values({
          project_id: projId,
          cycle_id: cycleId,
          job_number: `PJ-${projId}-${cycleId}`,
          status: "APPROVED"
        }).returning({ id: planning_jobs.id });
        jobId = newJob[0]?.id ?? null;
      }
    }

    const newPlan = await db.insert(project_plans).values({
      project_id: projId,
      equipment_id: eqId,
      month,
      required_qty: 0,
      status: "APPROVED",
      job_id: jobId,
      created_by: userId,
      approved_by: userId
    }).returning({ id: project_plans.id });

    if (!newPlan[0]?.id) {
      throw new Error("Failed to promote virtual plan");
    }

    planId = newPlan[0].id;
  } else if (typeof planId === "string") {
    planId = parseInt(planId, 10);
  }

  if (!planId || !Number.isFinite(planId)) {
    throw new Error("Invalid plan ID");
  }

  body.plan_id = planId;
  return planId;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireRole(request, ["ADMIN", "STORE_CENTER"]);
    if (!auth.ok) return auth.response;

    const env = getCloudflareContext().env;
    const db = getDb(env as any);
    const body = (await request.json()) as DecisionBody;
    const userId = auth.payload.id;

    if (!body.plan_id || !body.action_type) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const planId = await promoteVirtualPlanIfNeeded(db, body, userId);
    const plan = await getPlanById(db, planId);
    if (!plan) {
      return NextResponse.json({ success: false, error: "Plan not found" }, { status: 404 });
    }

    const actionQty = Number(body.qty) || 0;
    const actionType = body.action_type as DecisionAction;
    const inserted = await db.insert(center_decisions).values({
      plan_id: planId,
      action_type: actionType,
      qty: actionQty,
      notes: body.notes || "",
      action_by: userId,
    }).returning({
      id: center_decisions.id,
      plan_id: center_decisions.plan_id,
      action_type: center_decisions.action_type,
      qty: center_decisions.qty,
      notes: center_decisions.notes,
      created_at: center_decisions.created_at,
    });

    await applyDecisionEffect(db, plan, actionType, actionQty);
    await recalcPlanStatus(db, planId, Number(body.total_qty));

    const cycleIds = new Set<number>();
    const cycleId = body.cycle_id ? parseInt(String(body.cycle_id), 10) : await getCycleIdFromPlan(db, plan);
    if (cycleId) cycleIds.add(cycleId);
    await invalidateDecisionCaches(env, cycleIds);

    return NextResponse.json({
      success: true,
      decision: inserted[0] ?? null,
      plan_id: planId,
    });
  } catch (error: any) {
    console.error("POST Center Decision Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to save decision" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireRole(request, ["ADMIN", "STORE_CENTER"]);
    if (!auth.ok) return auth.response;

    const env = getCloudflareContext().env;
    const db = getDb(env as any);
    const body = (await request.json()) as DecisionBody;

    if (!body.decision_id || !body.action_type) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const decisionId = parseInt(String(body.decision_id), 10);
    const existing = await db.select().from(center_decisions).where(eq(center_decisions.id, decisionId)).limit(1);
    const decision = existing[0];
    if (!decision) {
      return NextResponse.json({ success: false, error: "Decision not found" }, { status: 404 });
    }

    const plan = await getPlanById(db, decision.plan_id);
    if (!plan) {
      return NextResponse.json({ success: false, error: "Plan not found" }, { status: 404 });
    }

    await revertDecisionEffect(db, plan, decision.action_type as DecisionAction, decision.qty || 0);

    const updatedAction = body.action_type as DecisionAction;
    const updatedQty = Number(body.qty) || 0;
    const updatedRows = await db.update(center_decisions)
      .set({
        action_type: updatedAction,
        qty: updatedQty,
        notes: body.notes || "",
      })
      .where(eq(center_decisions.id, decisionId))
      .returning({
        id: center_decisions.id,
        plan_id: center_decisions.plan_id,
        action_type: center_decisions.action_type,
        qty: center_decisions.qty,
        notes: center_decisions.notes,
        created_at: center_decisions.created_at,
      });

    await applyDecisionEffect(db, plan, updatedAction, updatedQty);
    await recalcPlanStatus(db, decision.plan_id, Number(body.total_qty));

    const cycleIds = new Set<number>();
    const cycleId = body.cycle_id ? parseInt(String(body.cycle_id), 10) : await getCycleIdFromPlan(db, plan);
    if (cycleId) cycleIds.add(cycleId);
    await invalidateDecisionCaches(env, cycleIds);

    return NextResponse.json({
      success: true,
      decision: updatedRows[0] ?? null,
      plan_id: decision.plan_id,
    });
  } catch (error: any) {
    console.error("PATCH Center Decision Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to update decision" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireRole(request, ["ADMIN", "STORE_CENTER"]);
    if (!auth.ok) return auth.response;

    const env = getCloudflareContext().env;
    const db = getDb(env as any);
    const { searchParams } = new URL(request.url);
    const queryId = searchParams.get("id");

    let ids: number[] = [];
    let totalQty: number | undefined;

    if (queryId) {
      ids = [parseInt(queryId, 10)];
    } else {
      const body = await request.json().then((value) => value as DecisionBody).catch(() => ({} as DecisionBody));
      ids = Array.isArray(body.ids)
        ? body.ids.map((id: any) => parseInt(String(id), 10)).filter((id: number) => Number.isFinite(id))
        : [];
      totalQty = Number(body.total_qty);
    }

    if (ids.length === 0) {
      return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });
    }

    const deletedIds: number[] = [];
    const cycleIds = new Set<number>();

    for (const decisionId of ids) {
      const decisionRows = await db.select().from(center_decisions).where(eq(center_decisions.id, decisionId)).limit(1);
      const decision = decisionRows[0];
      if (!decision) continue;

      const plan = await getPlanById(db, decision.plan_id);
      if (!plan) continue;

      await revertDecisionEffect(db, plan, decision.action_type as DecisionAction, decision.qty || 0);
      await db.delete(center_decisions).where(eq(center_decisions.id, decisionId));
      await recalcPlanStatus(db, decision.plan_id, totalQty);

      const cycleId = await getCycleIdFromPlan(db, plan);
      if (cycleId) cycleIds.add(cycleId);
      deletedIds.push(decisionId);
    }

    await invalidateDecisionCaches(env, cycleIds);

    return NextResponse.json({ success: true, deleted_ids: deletedIds });
  } catch (error: any) {
    console.error("DELETE Center Decision Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Failed to delete decision"
    }, { status: 500 });
  }
}
