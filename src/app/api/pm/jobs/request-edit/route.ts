import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { planning_jobs, project_plans, center_decisions, equipment_items } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireProject } from "@/lib/auth-check";

export async function POST(req: NextRequest) {
  try {
    const env = getCloudflareContext().env;
    const db = getDb(env as any);

    const { job_id } = await req.json() as any;
    if (!job_id) return NextResponse.json({ success: false, error: "Missing job_id" }, { status: 400 });

    const job = await db.select().from(planning_jobs).where(eq(planning_jobs.id, job_id)).get();
    if (!job) return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });

    const auth = await requireProject(req, job.project_id, ["PROJECT_MANAGER"]);
    if (!auth.ok) return auth.response;

    if (job.status !== "APPROVED") return NextResponse.json({ success: false, error: "Job must be APPROVED" }, { status: 400 });

    const centerActionRows = await db.select({
      equipment_name: equipment_items.name,
    })
      .from(center_decisions)
      .innerJoin(project_plans, eq(center_decisions.plan_id, project_plans.id))
      .innerJoin(equipment_items, eq(project_plans.equipment_id, equipment_items.id))
      .where(eq(project_plans.job_id, job_id));

    if (centerActionRows.length > 0) {
      const lockedItems = Array.from(new Set(
        centerActionRows
          .map((row) => row.equipment_name)
          .filter((name): name is string => typeof name === "string" && name.length > 0)
      ));
      const preview = lockedItems.length > 0 ? lockedItems.slice(0, 3).join(", ") : "บางรายการ";
      const suffix = lockedItems.length > 3 ? ` และอีก ${lockedItems.length - 3} รายการ` : "";
      return NextResponse.json({
        success: false,
        error: `ไม่สามารถขอแก้ไขได้ เนื่องจากรายการ ${preview}${suffix} ถูกดำเนินการวางแผนโดย Store Center แล้ว`
      }, { status: 400 });
    }

    await db.update(planning_jobs)
      .set({ edit_requested: 1 })
      .where(and(eq(planning_jobs.id, job_id), eq(planning_jobs.status, "APPROVED")));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
