import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getUserPayload } from "@/lib/auth-check";
import { hashPassword } from "@/lib/password";
import { eq } from "drizzle-orm";

export const runtime = "edge";

export async function PUT(request: NextRequest) {
  try {
    const payload = await getUserPayload(request);
    if (!payload) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json() as any;
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ success: false, error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const env = getRequestContext().env;
    const db = getDb(env as any);

    const password_hash = await hashPassword(newPassword);

    await db.update(users).set({ password_hash }).where(eq(users.id, payload.id));

    return NextResponse.json({ success: true, message: "Password updated successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
