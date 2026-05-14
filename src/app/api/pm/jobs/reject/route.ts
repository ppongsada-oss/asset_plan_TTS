import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { planning_jobs, project_plans, planning_logs } from "@/db/schema";
import { eq } from "drizzle-orm";
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

    const { job_id, notes } = await req.json() as any;
    if (!job_id) return NextResponse.json({ success: false, error: "Missing job_id" }, { status: 400 });
    
    // Ensure payload is valid
    if (!payload || !payload.id) {
      return NextResponse.json({ success: false, error: "Invalid session or user" }, { status: 401 });
    }

    const jobIdInt = typeof job_id === "string" ? parseInt(job_id) : job_id;

    // 1. Update Job Status to REJECTED so Site knows it was sent back
    await db.update(planning_jobs)
      .set({ status: "REJECTED" })
      .where(eq(planning_jobs.id, jobIdInt));

    // 2. Update individual plan statuses to REJECTED
    await db.update(project_plans)
      .set({ status: "REJECTED" })
      .where(eq(project_plans.job_id, jobIdInt));

    // 3. Log action
    await db.insert(planning_logs).values({
      job_id: jobIdInt,
      action: "PM_REJECT",
      details: JSON.stringify({ notes: notes || "No notes provided" }),
      user_id: payload.id,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
