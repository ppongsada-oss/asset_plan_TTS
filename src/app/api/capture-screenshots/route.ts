import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users, project_roles } from "@/db/schema";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { signToken } from "@/lib/jwt";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "auth") {
      const env = getCloudflareContext().env;
      const db = getDb(env as any);
      
      const email = "p.pongsada@gmail.com";
      const userRecords = await db.select().from(users).where(eq(users.email, email)).limit(1);
      const user = userRecords[0];

      if (!user) {
        return NextResponse.json({ success: false, error: "User not found in database" }, { status: 404 });
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
      const response = NextResponse.json({ success: true, message: "Logged in successfully as p.pongsada@gmail.com" });
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
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Capture-Screenshots Auth Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
