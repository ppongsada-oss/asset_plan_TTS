import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getUserPayload } from "@/lib/auth-check";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const payload = await getUserPayload(request);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const env = getRequestContext().env;
    const db = getDb(env as any);

    // Fetch all users
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        global_role: users.global_role,
      })
      .from(users);

    return NextResponse.json({ success: true, data: allUsers });
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

    const env = getRequestContext().env;
    const db = getDb(env as any);
    const body = await request.json() as any;

    const { email, password, global_role } = body;
    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 });
    }

    const password_hash = await hashPassword(password);

    await db.insert(users).values({
      email,
      password_hash,
      global_role: global_role || "USER",
    });

    return NextResponse.json({ success: true, message: "User created successfully" });
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint failed") || error.message?.includes("D1_ERROR")) {
      return NextResponse.json({ success: false, error: "Email already exists" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
