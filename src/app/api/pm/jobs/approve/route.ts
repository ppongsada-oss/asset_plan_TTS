import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { planning_jobs, project_plans, planning_logs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";
import { invalidateCache } from "@/lib/cache";


export async function POST(req: NextRequest) {
  try {
    const env = getCloudflareContext().env;
    const db = getDb(env as any);
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const payload = await verifyToken(token) as any;

    const { job_id } = await req.json() as any;
    if (!job_id) return NextResponse.json({ success: false, error: "Missing job_id" }, { status: 400 });

    // Update Job Status
    await db.update(planning_jobs)
      .set({ status: "APPROVED" })
      .where(eq(planning_jobs.id, job_id));

    // Update individual plan statuses (optional, but good for consistency)
    await db.update(project_plans)
      .set({ status: "APPROVED", approved_by: payload.id })
      .where(eq(project_plans.job_id, job_id));

    // Log action
    await db.insert(planning_logs).values({
      job_id,
      action: "PM_APPROVE",
      details: "Approved by PM",
      user_id: payload.id,
    });

    // 4. Invalidate Matrix Report Cache
    const kv = (env as any).CACHE_KV;
    if (kv) {
      await invalidateCache(kv);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
