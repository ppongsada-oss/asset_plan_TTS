import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { planning_jobs, project_plans } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { verifyToken } from "@/lib/jwt";
import { cookies } from "next/headers";

export const runtime = "edge";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const jobId = parseInt(id);
    const env = getRequestContext().env;
    const db = getDb(env as any);
    
    // 1. Auth check
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    const payload = await verifyToken(token) as any;
    if (payload.role !== "ADMIN" && payload.role !== "STORE_CENTER") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // 2. Check job status
    const job = await db.select().from(planning_jobs).where(eq(planning_jobs.id, jobId)).get();
    if (!job) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    if (job.status === "APPROVED") {
      return NextResponse.json({ 
        success: false, 
        error: "ไม่สามารถยกเลิกใบงานได้เนื่องจากสถานะเป็น APPROVED แล้ว" 
      }, { status: 400 });
    }

    // 3. Delete job and related data
    // We should also delete related project_plans to clean up
    await db.delete(project_plans).where(eq(project_plans.job_id, jobId));
    await db.delete(planning_jobs).where(eq(planning_jobs.id, jobId));

    return NextResponse.json({ success: true, message: "Job cancelled successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
