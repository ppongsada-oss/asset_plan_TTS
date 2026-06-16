import { NextRequest, NextResponse } from "next/server";
import { getDb, type Env } from "@/db";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { projects } from "@/db/schema";
import { inArray } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-check";
import { getProjectsCacheKey } from "@/lib/cache";


export async function GET(req: NextRequest) {
  try {
    const env = getCloudflareContext().env;
    const db = getDb(env as Env);
    const kv = (env as Env).CACHE_KV;

    const auth = await requireAuth(req);
    if (!auth.ok) return auth.response;

    const accessibleIds = Object.keys(auth.payload.projectRoles || {});
    const cacheKey = getProjectsCacheKey(auth.payload.role, accessibleIds);
    const cached = await kv?.get(cacheKey, "json") as { success: true; data: unknown[] } | null;
    if (cached) {
      return NextResponse.json(cached);
    }

    let allProjects;
    if (auth.payload.role === "ADMIN" || auth.payload.role === "STORE_CENTER") {
      allProjects = await db.select().from(projects);
    } else {
      if (accessibleIds.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }
      allProjects = await db.select().from(projects).where(inArray(projects.id, accessibleIds));
    }

    const payload = { success: true, data: allProjects };
    await kv?.put(cacheKey, JSON.stringify(payload), { expirationTtl: 120 });

    return NextResponse.json(payload);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
