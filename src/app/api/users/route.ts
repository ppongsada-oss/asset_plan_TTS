import { NextRequest, NextResponse } from "next/server";
import { getDb, type Env } from "@/db";
import { users } from "@/db/schema";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserPayload } from "@/lib/auth-check";
import { invalidateCache, USERS_CACHE_KEY } from "@/lib/cache";

type UserCreateBody = {
  email?: string;
  password?: string;
  global_role?: "ADMIN" | "STORE_CENTER" | "USER";
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

    const cached = await kv?.get(USERS_CACHE_KEY, "json") as { success: true; data: unknown[] } | null;
    if (cached) {
      return NextResponse.json(cached);
    }

    // Fetch all users
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        global_role: users.global_role,
      })
      .from(users);

    const payloadResponse = { success: true, data: allUsers };
    await kv?.put(USERS_CACHE_KEY, JSON.stringify(payloadResponse), { expirationTtl: 120 });
    return NextResponse.json(payloadResponse);
  } catch (error) {
    console.error("GET Users Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch users" }, { status: 500 });
  }
}

import { hashPassword } from "@/lib/password";

export async function POST(request: NextRequest) {
  try {
    const payload = await getUserPayload(request);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const env = getCloudflareContext().env as Env;
    const db = getDb(env);
    const body = await request.json() as UserCreateBody;

    const { email, password, global_role } = body;
    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const password_hash = await hashPassword(password);

    await db.insert(users).values({
      email: normalizedEmail,
      password_hash,
      global_role: global_role || "USER",
    });

    await invalidateCache(env.CACHE_KV);
    return NextResponse.json({ success: true, message: "User created successfully" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (message.includes("UNIQUE constraint failed") || message.includes("D1_ERROR")) {
      return NextResponse.json({ success: false, error: "Email already exists" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
