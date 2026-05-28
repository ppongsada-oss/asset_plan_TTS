import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { project_plans, planning_logs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const env = getRequestContext().env;
    const db = getDb(env as any);
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const payload = await verifyToken(token) as any;

    const body = (await req.json()) as any;
    const { job_id, project_id, changes } = body; 
    // changes expected to be array of: { equipment_id, month, old_qty, new_qty }

    if (!job_id || !project_id || !changes || !Array.isArray(changes)) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // 1. Update, Insert or Delete project_plans
    for (const change of changes) {
      const existing = await db.select()
        .from(project_plans)
        .where(and(
          eq(project_plans.job_id, job_id),
          eq(project_plans.equipment_id, change.equipment_id),
          eq(project_plans.month, change.month)
        ))
        .get();

      if (existing) {
        if (change.new_qty === 0) {
          await db.delete(project_plans)
            .where(and(
              eq(project_plans.job_id, job_id),
              eq(project_plans.equipment_id, change.equipment_id),
              eq(project_plans.month, change.month)
            ));
        } else {
          await db.update(project_plans)
            .set({ required_qty: change.new_qty })
            .where(and(
              eq(project_plans.job_id, job_id),
              eq(project_plans.equipment_id, change.equipment_id),
              eq(project_plans.month, change.month)
            ));
        }
      } else if (change.new_qty > 0) {
        await db.insert(project_plans)
          .values({
            job_id,
            project_id,
            equipment_id: change.equipment_id,
            month: change.month,
            required_qty: change.new_qty,
            created_by: payload.id
          });
      }
    }

    // 2. Create log entry
    await db.insert(planning_logs).values({
      job_id,
      action: "PM_EDIT",
      details: JSON.stringify(changes),
      user_id: payload.id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PM Save Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
