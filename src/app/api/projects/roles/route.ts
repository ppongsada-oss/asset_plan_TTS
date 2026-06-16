import { NextRequest, NextResponse } from "next/server";
import { getDb, type Env } from "@/db";
import { project_roles, users } from "@/db/schema";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserPayload } from "@/lib/auth-check";
import { eq, and } from "drizzle-orm";
import { invalidateCache, PROJECT_ROLES_CACHE_KEY } from "@/lib/cache";

type ProjectRoleMutationBody = {
  user_id?: number;
  project_id?: string;
  role?: "STORE_SITE" | "PROJECT_MANAGER" | "VIEWER";
};


export async function GET(request: NextRequest) {
  try {
    const payload = await getUserPayload(request);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const env = getCloudflareContext().env as Env;
    const db = getDb(env);
    const kv = env.CACHE_KV;

    const cached = await kv?.get(PROJECT_ROLES_CACHE_KEY, "json") as { success: true; data: unknown[] } | null;
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch all project roles with user info
    const roles = await db
      .select({
        id: project_roles.id,
        project_id: project_roles.project_id,
        role: project_roles.role,
        user_id: users.id,
        email: users.email,
      })
      .from(project_roles)
      .innerJoin(users, eq(project_roles.user_id, users.id));

    const payloadResponse = { success: true, data: roles };
    await kv?.put(PROJECT_ROLES_CACHE_KEY, JSON.stringify(payloadResponse), { expirationTtl: 120 });
    return NextResponse.json(payloadResponse);
  } catch (error) {
    console.error("GET Project Roles Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch roles" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserPayload(request);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const env = getCloudflareContext().env as Env;
    const db = getDb(env);
    const { user_id, project_id, role } = await request.json() as ProjectRoleMutationBody;

    if (!user_id || !project_id || !role) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    // Check if role already exists for this user and project
    const existing = await db
      .select()
      .from(project_roles)
      .where(and(eq(project_roles.user_id, user_id), eq(project_roles.project_id, project_id)))
      .limit(1);

    if (existing.length > 0) {
      // Update
      await db
        .update(project_roles)
        .set({ role })
        .where(eq(project_roles.id, existing[0].id));
    } else {
      // Insert
      await db.insert(project_roles).values({ user_id, project_id, role });
    }

    await invalidateCache(env.CACHE_KV);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST Project Role Error:", error);
    return NextResponse.json({ success: false, error: "Failed to assign role" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const payload = await getUserPayload(request);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const env = getCloudflareContext().env as Env;
    const db = getDb(env);
    const url = new URL(request.url);
    const idStr = url.searchParams.get("id");
    
    if (!idStr) {
      return NextResponse.json({ success: false, error: "Missing ID" }, { status: 400 });
    }

    const id = parseInt(idStr, 10);
    await db.delete(project_roles).where(eq(project_roles.id, id));

    await invalidateCache(env.CACHE_KV);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE Project Role Error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete role" }, { status: 500 });
  }
}
