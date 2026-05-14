import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users, project_roles } from "@/db/schema";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { comparePassword } from "@/lib/password";
import { signToken } from "@/lib/jwt";
import { eq } from "drizzle-orm";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const env = getRequestContext().env;
    const db = getDb(env as any);
    const { email, password } = await request.json() as any;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password required" }, { status: 400 });
    }

    const userRecords = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = userRecords[0];

    if (!user) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
    }

    // Fetch project roles
    const userRoles = await db.select().from(project_roles).where(eq(project_roles.user_id, user.id));
    const projectRolesMap = userRoles.reduce((acc, roleItem) => {
      acc[roleItem.project_id] = roleItem.role;
      return acc;
    }, {} as Record<string, string>);

    // Create JWT
    const payload = {
      id: user.id,
      email: user.email,
      role: user.global_role,
      projectRoles: projectRolesMap,
    };
    const token = await signToken(payload);

    // Set cookie
    const response = NextResponse.json({ success: true, data: payload });
    response.cookies.set({
      name: "token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ success: false, error: "Login failed" }, { status: 500 });
  }
}
