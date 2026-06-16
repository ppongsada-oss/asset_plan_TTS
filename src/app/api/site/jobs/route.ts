import { NextRequest, NextResponse } from "next/server";
import { getDb, type Env } from "@/db";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { planning_jobs, planning_cycles, projects } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { getUserPayload } from "@/lib/auth-check";
import { getSiteJobsCacheKey } from "@/lib/cache";


export async function GET(req: NextRequest) {
  try {
    const context = getCloudflareContext();
    if (!context || !context.env) {
      console.error("API Error: Cloudflare environment not found");
      return NextResponse.json({ success: false, error: "Environment configuration error" }, { status: 500 });
    }

    const env = context.env as Env;
    if (!env.DB) {
      console.error("API Error: D1 Database not found in environment");
      return NextResponse.json({ success: false, error: "Database connection error" }, { status: 500 });
    }

    const db = getDb(env);
    
    const payload = await getUserPayload(req);
    if (!payload) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("project_id");
    const accessibleIds = Object.keys(payload.projectRoles || {});
    const cacheKey = getSiteJobsCacheKey(payload.role, accessibleIds, projectId);
    const cached = await env.CACHE_KV?.get(cacheKey, "json") as { success: true; data: unknown[] } | null;
    if (cached) {
      return NextResponse.json(cached);
    }
    
    console.log(`[API] Fetching jobs for user: ${payload.email}, project_id: ${projectId}`);

    const baseQuery = db.select({
      id: planning_jobs.id,
      project_id: planning_jobs.project_id,
      project_name: projects.name,
      job_number: planning_jobs.job_number,
      status: planning_jobs.status,
      is_unlocked: planning_jobs.is_unlocked,
      cycle_number: planning_cycles.cycle_number,
      start_date: planning_cycles.start_date,
      end_date: planning_cycles.end_date,
      target_months: planning_cycles.target_months,
    })
    .from(planning_jobs)
    .innerJoin(planning_cycles, eq(planning_jobs.cycle_id, planning_cycles.id))
    .innerJoin(projects, eq(planning_jobs.project_id, projects.id));

    let jobs;
    if (projectId && projectId !== "ALL") {
      if (payload.role !== "ADMIN" && payload.role !== "STORE_CENTER" && !payload.projectRoles[projectId]) {
        console.warn(`[API] Access denied for user ${payload.email} to project ${projectId}`);
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
      jobs = await baseQuery.where(eq(planning_jobs.project_id, projectId));
    } else {
      if (payload.role !== "ADMIN" && payload.role !== "STORE_CENTER") {
        if (accessibleIds.length === 0) return NextResponse.json({ success: true, data: [] });
        jobs = await baseQuery.where(inArray(planning_jobs.project_id, accessibleIds));
      } else {
        jobs = await baseQuery;
      }
    }

    console.log(`[API] Found ${jobs.length} jobs`);
    const payloadResponse = { success: true, data: jobs };
    await env.CACHE_KV?.put(cacheKey, JSON.stringify(payloadResponse), { expirationTtl: 120 });
    return NextResponse.json(payloadResponse);
  } catch (error: unknown) {
    console.error("GET Site Jobs Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
