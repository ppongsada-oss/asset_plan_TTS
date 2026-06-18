import { NextResponse } from "next/server";
import { getDb, type Env } from "@/db";
import { users } from "@/db/schema";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { hashPassword } from "@/lib/password";
import { eq } from "drizzle-orm";

const allowUnsafeDevHelpers =
  process.env.NODE_ENV !== "production" &&
  process.env.ENABLE_UNSAFE_DEV_HELPERS === "true";
const seedEmail = process.env.UNSAFE_DEV_SEED_EMAIL;
const seedPassword = process.env.UNSAFE_DEV_SEED_PASSWORD;

const notFound = () =>
  NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

const misconfigured = () =>
  NextResponse.json(
    { success: false, error: "Unsafe dev seed helper is not configured" },
    { status: 500 }
  );

export async function GET() {
  return notFound();
}

export async function POST() {
  if (!allowUnsafeDevHelpers) {
    return notFound();
  }

  if (!seedEmail || !seedPassword) {
    return misconfigured();
  }

  try {
    const env = getCloudflareContext().env as Env;
    const db = getDb(env);
    const normalizedSeedEmail = seedEmail.trim().toLowerCase();

    const password_hash = await hashPassword(seedPassword);

    // Check if user exists
    const existing = await db.select().from(users).where(eq(users.email, normalizedSeedEmail)).limit(1);
    if (existing.length > 0) {
      await db.update(users).set({ password_hash }).where(eq(users.email, normalizedSeedEmail));
      return NextResponse.json({ success: true, message: "User already seeded, password updated" });
    }

    await db.insert(users).values({
      email: normalizedSeedEmail,
      password_hash,
      global_role: "ADMIN"
    });

    return NextResponse.json({ success: true, message: "Admin user seeded successfully" });
  } catch (error: unknown) {
    console.error("Seed Error:", error);
    return NextResponse.json({ success: false, error: "Seed failed" }, { status: 500 });
  }
}
