import { NextRequest, NextResponse } from "next/server";
import { getDb, type Env } from "@/db";
import { project_roles, users } from "@/db/schema";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { verifyToken } from "@/lib/jwt";
import { getPasswordTokenFingerprint } from "@/lib/password";

export type TokenPayload = {
  id: number;
  email: string;
  pwd?: string;
};

export type AuthPayload = {
  id: number;
  email: string;
  role: string;
  projectRoles: Record<string, string>;
};

export type AuthUserRecord = {
  id: number;
  email: string;
  global_role: string;
  password_hash: string;
};

export type ProjectRoleRecord = {
  project_id: string;
  role: string;
};

export type AuthResolverDeps = {
  verifyToken: (token: string) => Promise<unknown>;
  findUserById: (id: number) => Promise<AuthUserRecord | null>;
  findProjectRoles: (userId: number) => Promise<ProjectRoleRecord[]>;
};

export type AuthenticatedResult =
  | { ok: true; payload: AuthPayload }
  | { ok: false; response: NextResponse };

type RequestLike = Request | NextRequest;

const unauthorized = (message = "Unauthorized", status = 401) =>
  NextResponse.json({ success: false, error: message }, { status });

const getCookieHeader = (request: RequestLike) => request.headers.get("cookie") || "";

const getTokenFromCookieHeader = (cookieHeader: string) => {
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
  return match?.[1];
};

const getTokenFromRequest = (request: RequestLike) => {
  if ("cookies" in request) {
    return request.cookies.get("token")?.value;
  }

  return getTokenFromCookieHeader(getCookieHeader(request));
};

export const toProjectRolesMap = (userRoles: ProjectRoleRecord[]) =>
  userRoles.reduce((acc, roleItem) => {
    acc[roleItem.project_id] = roleItem.role;
    return acc;
  }, {} as Record<string, string>);

export async function resolveAuthPayload(
  token: string,
  deps: AuthResolverDeps
): Promise<AuthPayload | null> {
  const payload = await deps.verifyToken(token);
  if (!payload) return null;

  const tokenPayload = payload as TokenPayload;
  if (!tokenPayload.id || !tokenPayload.email || !tokenPayload.pwd) {
    return null;
  }

  const user = await deps.findUserById(tokenPayload.id);
  if (!user) return null;

  const currentPasswordFingerprint = await getPasswordTokenFingerprint(user.password_hash);
  if (currentPasswordFingerprint !== tokenPayload.pwd) {
    return null;
  }

  const userRoles = await deps.findProjectRoles(user.id);

  return {
    id: user.id,
    email: user.email,
    role: user.global_role,
    projectRoles: toProjectRolesMap(userRoles),
  };
}

export async function getUserPayloadFromToken(token: string): Promise<AuthPayload | null> {
  const env = getCloudflareContext().env as Env;
  const db = getDb(env);
  return resolveAuthPayload(token, {
    verifyToken,
    findUserById: async (id) => {
      const userRecords = await db.select().from(users).where(eq(users.id, id)).limit(1);
      const user = userRecords[0];
      return user
        ? {
            id: user.id,
            email: user.email,
            global_role: user.global_role,
            password_hash: user.password_hash,
          }
        : null;
    },
    findProjectRoles: async (userId) =>
      db.select().from(project_roles).where(eq(project_roles.user_id, userId)),
  });
}

export async function getUserPayload(request: RequestLike): Promise<AuthPayload | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  return getUserPayloadFromToken(token);
}

export const hasGlobalRole = (payload: AuthPayload, requiredRoles: string[]) =>
  requiredRoles.includes(payload.role);

export const hasProjectRole = (
  payload: AuthPayload,
  projectId: string,
  requiredRoles?: string[]
) => {
  if (payload.role === "ADMIN") return true;

  const projectRole = payload.projectRoles?.[projectId];
  if (!projectRole) return false;

  if (!requiredRoles || requiredRoles.length === 0) {
    return true;
  }

  return requiredRoles.includes(projectRole);
};

export async function requireAuth(request: RequestLike): Promise<AuthenticatedResult> {
  const payload = await getUserPayload(request);
  if (!payload) {
    return { ok: false, response: unauthorized() };
  }

  return { ok: true, payload };
}

export async function requireRole(
  request: RequestLike,
  requiredRoles: string[]
): Promise<AuthenticatedResult> {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth;
  }

  if (!hasGlobalRole(auth.payload, requiredRoles)) {
    return { ok: false, response: unauthorized("Forbidden", 403) };
  }

  return auth;
}

export async function requireProject(
  request: RequestLike,
  projectId: string,
  requiredRoles?: string[]
): Promise<AuthenticatedResult> {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return auth;
  }

  if (!projectId || projectId === "ALL") {
    return { ok: false, response: unauthorized("Project ID is required", 400) };
  }

  if (!hasProjectRole(auth.payload, projectId, requiredRoles)) {
    return { ok: false, response: unauthorized("Forbidden", 403) };
  }

  return auth;
}

export async function checkProjectAccess(
  request: RequestLike,
  projectId: string,
  requiredRoles?: string[]
): Promise<boolean> {
  const auth = await requireProject(request, projectId, requiredRoles);
  return auth.ok;
}
