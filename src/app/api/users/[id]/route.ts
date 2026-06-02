import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserPayload } from "@/lib/auth-check";
import { hashPassword } from "@/lib/password";
import { eq } from "drizzle-orm";


export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getUserPayload(request);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, error: "Invalid user ID" }, { status: 400 });
    }

    const env = getCloudflareContext().env;
    const db = getDb(env as any);
    const body = await request.json() as any;

    const { email, password, global_role } = body;
    if (!email || !global_role) {
      return NextResponse.json({ success: false, error: "Email and role are required" }, { status: 400 });
    }

    const updateData: any = {
      email,
      global_role,
    };

    if (password && password.trim() !== "") {
      updateData.password_hash = await hashPassword(password);
    }

    await db.update(users).set(updateData).where(eq(users.id, userId));

    return NextResponse.json({ success: true, message: "User updated successfully" });
  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ success: false, error: "Email already exists" }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await getUserPayload(request);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
    }

    const resolvedParams = await params;
    const userId = parseInt(resolvedParams.id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, error: "Invalid user ID" }, { status: 400 });
    }

    // Prevent deleting oneself
    if (payload.id === userId) {
      return NextResponse.json({ success: false, error: "Cannot delete your own account" }, { status: 400 });
    }

    const env = getCloudflareContext().env;
    const db = getDb(env as any);

    await db.delete(users).where(eq(users.id, userId));

    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
