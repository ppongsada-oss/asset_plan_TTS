import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { planning_jobs, planning_cycles, projects } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getUserPayload } from "@/lib/auth-check";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const context = getRequestContext();
    if (!context || !context.env) {
      console.error("API Error: Cloudflare environment not found");
      return NextResponse.json({ success: false, error: "Environment configuration error" }, { status: 500 });
    }

    const env = context.env;
    if (!env.DB) {
      console.error("API Error: D1 Database not found in environment");
      return NextResponse.json({ success: false, error: "Database connection error" }, { status: 500 });
    }

    const db = getDb(env as any);
    
    const payload = await getUserPayload(req);
    if (!payload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    
    console.log(`[API] Fetching jobs for user: ${payload.email}, project_id: ${projectId}`);

    let query = db.select({
      id: planning_jobs.id,
      project_id: planning_jobs.project_id,
      project_name: projects.name,
      job_number: planning_jobs.job_number,
      status: planning_jobs.status,
      cycle_number: planning_cycles.cycle_number,
      start_date: planning_cycles.start_date,
      end_date: planning_cycles.end_date,
      target_months: planning_cycles.target_months,
    })
    .from(planning_jobs)
    .innerJoin(planning_cycles, eq(planning_jobs.cycle_id, planning_cycles.id))
    .innerJoin(projects, eq(planning_jobs.project_id, projects.id));

    if (projectId && projectId !== "ALL") {
      if (payload.role !== "ADMIN" && payload.role !== "STORE_CENTER" && !payload.projectRoles[projectId]) {
        console.warn(`[API] Access denied for user ${payload.email} to project ${projectId}`);
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
      query = query.where(eq(planning_jobs.project_id, projectId)) as any;
    } else {
      if (payload.role !== "ADMIN" && payload.role !== "STORE_CENTER") {
        const accessibleIds = Object.keys(payload.projectRoles || {});
        if (accessibleIds.length === 0) return NextResponse.json({ success: true, data: [] });
        query = query.where(inArray(planning_jobs.project_id, accessibleIds)) as any;
      }
    }

    const jobs = await query;
    console.log(`[API] Found ${jobs.length} jobs`);
    return NextResponse.json({ success: true, data: jobs });
  } catch (error: any) {
    console.error("GET Site Jobs Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
