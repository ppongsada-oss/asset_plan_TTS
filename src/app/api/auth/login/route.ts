import { NextRequest, NextResponse } from "next/server";
import { getDb, type Env } from "@/db";
import { users, project_roles } from "@/db/schema";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { comparePassword, getPasswordTokenFingerprint, hashPassword, needsPasswordRehash } from "@/lib/password";
import { signToken } from "@/lib/jwt";
import { TokenPayload } from "@/lib/auth-check";
import { eq, sql } from "drizzle-orm";

type LoginRequestBody = {
  email?: string;
  password?: string;
};

type LoginRateLimitState = {
  count: number;
};

const LOGIN_RATE_LIMIT_PREFIX = "login_rate_v1";
const LOGIN_WINDOW_SECONDS = 15 * 60;
const LOGIN_MAX_ATTEMPTS_PER_EMAIL_IP = 8;
const LOGIN_MAX_ATTEMPTS_PER_IP = 20;

const getClientIp = (request: NextRequest) =>
  request.headers.get("cf-connecting-ip") ||
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  request.headers.get("x-real-ip") ||
  "unknown";

const getEmailKey = (email: string, ip: string) =>
  `${LOGIN_RATE_LIMIT_PREFIX}:email:${encodeURIComponent(email.toLowerCase())}:ip:${encodeURIComponent(ip)}`;

const getIpKey = (ip: string) =>
  `${LOGIN_RATE_LIMIT_PREFIX}:ip:${encodeURIComponent(ip)}`;

const readRateState = async (kv: KVNamespace | undefined, key: string) => {
  if (!kv) return null;
  return await kv.get(key, "json") as LoginRateLimitState | null;
};

const writeRateState = async (kv: KVNamespace | undefined, key: string, count: number) => {
  if (!kv) return;
  await kv.put(key, JSON.stringify({ count }), { expirationTtl: LOGIN_WINDOW_SECONDS });
};

export async function POST(request: NextRequest) {
  try {
    const env = getCloudflareContext().env as Env;
    const db = getDb(env);
    const kv = env.CACHE_KV;
    const { email, password } = (await request.json()) as LoginRequestBody;

    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const clientIp = getClientIp(request);
    const emailKey = getEmailKey(normalizedEmail, clientIp);
    const ipKey = getIpKey(clientIp);

    const [emailState, ipState] = await Promise.all([
      readRateState(kv, emailKey),
      readRateState(kv, ipKey),
    ]);

    if ((emailState?.count || 0) >= LOGIN_MAX_ATTEMPTS_PER_EMAIL_IP || (ipState?.count || 0) >= LOGIN_MAX_ATTEMPTS_PER_IP) {
      return NextResponse.json(
        { success: false, error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(LOGIN_WINDOW_SECONDS) } }
      );
    }

    const userRecords = await db
      .select()
      .from(users)
      .where(sql`lower(trim(${users.email})) = ${normalizedEmail}`)
      .limit(1);
    const user = userRecords[0];

    if (!user) {
      await Promise.all([
        writeRateState(kv, emailKey, (emailState?.count || 0) + 1),
        writeRateState(kv, ipKey, (ipState?.count || 0) + 1),
      ]);
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      await Promise.all([
        writeRateState(kv, emailKey, (emailState?.count || 0) + 1),
        writeRateState(kv, ipKey, (ipState?.count || 0) + 1),
      ]);
      return NextResponse.json({ success: false, error: "Invalid credentials" }, { status: 401 });
    }

    let activePasswordHash = user.password_hash;
    if (needsPasswordRehash(user.password_hash)) {
      const upgradedHash = await hashPassword(password);
      await db.update(users)
        .set({ password_hash: upgradedHash })
        .where(eq(users.id, user.id));
      activePasswordHash = upgradedHash;
    }

    // Fetch project roles
    const userRoles = await db.select().from(project_roles).where(eq(project_roles.user_id, user.id));
    const projectRolesMap = userRoles.reduce((acc, roleItem) => {
      acc[roleItem.project_id] = roleItem.role;
      return acc;
    }, {} as Record<string, string>);

    const responsePayload = {
      id: user.id,
      email: user.email,
      role: user.global_role,
      projectRoles: projectRolesMap,
    };
    const tokenPayload: TokenPayload = {
      id: user.id,
      email: user.email,
      pwd: await getPasswordTokenFingerprint(activePasswordHash),
    };
    const token = await signToken(tokenPayload);

    await kv?.delete(emailKey);

    // Set cookie
    const response = NextResponse.json({ success: true, data: responsePayload });
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
