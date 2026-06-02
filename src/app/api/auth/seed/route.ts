import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { hashPassword } from "@/lib/password";
import { eq } from "drizzle-orm";


export async function GET(request: NextRequest) {
  try {
    const env = getCloudflareContext().env;
    const db = getDb(env as any);

    const email = "admin@tts-construction.com";
    
    const password_hash = await hashPassword("password123");

    // Check if user exists
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      await db.update(users).set({ password_hash }).where(eq(users.email, email));
      return NextResponse.json({ success: true, message: "User already seeded, password updated to SHA-256" });
    }

    await db.insert(users).values({
      email,
      password_hash,
      global_role: "ADMIN"
    });

    return NextResponse.json({ success: true, message: "Admin user seeded successfully" });
  } catch (error: any) {
    console.error("Seed Error:", error);
    return NextResponse.json({ success: false, error: error.message || String(error), stack: error.stack }, { status: 500 });
  }
}
