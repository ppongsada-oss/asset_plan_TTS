import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { planning_jobs, planning_logs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { invalidateCache } from "@/lib/cache";
import { requireRole } from "@/lib/auth-check";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole(req, ["ADMIN", "STORE_CENTER"]);
    if (!auth.ok) return auth.response;

    const env = getCloudflareContext().env;
    const db = getDb(env as any);

    const { job_id } = await req.json() as any;
    if (!job_id) return NextResponse.json({ success: false, error: "Missing job_id" }, { status: 400 });

    const job = await db.select().from(planning_jobs).where(eq(planning_jobs.id, job_id)).get();
    if (!job) return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    if (job.status !== "APPROVED") return NextResponse.json({ success: false, error: "Job must be APPROVED" }, { status: 400 });
    if (!job.edit_requested) return NextResponse.json({ success: false, error: "PM has not requested edit" }, { status: 400 });

    await db.update(planning_jobs)
      .set({ status: "SUBMITTED", edit_requested: 0 })
      .where(and(eq(planning_jobs.id, job_id), eq(planning_jobs.status, "APPROVED")));

    await db.insert(planning_logs).values({
      job_id,
      action: "CENTER_REJECT",
      details: "Reverted APPROVED → SUBMITTED by Store Center (PM edit request)",
      user_id: auth.payload.id,
    });

    const kv = (env as any).CACHE_KV;
    if (kv) await invalidateCache(kv, job.cycle_id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
