import { NextRequest, NextResponse } from "next/server";
import { getDb, type Env } from "@/db";
import { users } from "@/db/schema";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { signToken } from "@/lib/jwt";
import { TokenPayload } from "@/lib/auth-check";
import { eq } from "drizzle-orm";
import { getPasswordTokenFingerprint } from "@/lib/password";

const allowUnsafeDevHelpers =
  process.env.NODE_ENV !== "production" &&
  process.env.ENABLE_UNSAFE_DEV_HELPERS === "true";
const helperEmail = process.env.UNSAFE_DEV_SCREENSHOT_EMAIL;

const notFound = () =>
  NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

const misconfigured = () =>
  NextResponse.json(
    { success: false, error: "Unsafe screenshot helper is not configured" },
    { status: 500 }
  );

export async function GET(request: NextRequest) {
  if (!allowUnsafeDevHelpers) {
    return notFound();
  }

  if (!helperEmail) {
    return misconfigured();
  }

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "auth") {
      const env = getCloudflareContext().env as Env;
      const db = getDb(env);
      
      const userRecords = await db.select().from(users).where(eq(users.email, helperEmail)).limit(1);
      const user = userRecords[0];

      if (!user) {
        return NextResponse.json({ success: false, error: "User not found in database" }, { status: 404 });
      }
      const payload: TokenPayload = {
        id: user.id,
        email: user.email,
        pwd: await getPasswordTokenFingerprint(user.password_hash),
      };
      const token = await signToken(payload);

      // Set cookie
      const response = NextResponse.json({ success: true, message: "Logged in successfully" });
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
  } catch (error: unknown) {
    console.error("Capture-Screenshots Auth Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
