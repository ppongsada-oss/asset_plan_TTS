import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/jwt";

export type AuthPayload = {
  id: number;
  email: string;
  role: string;
  projectRoles: Record<string, string>;
};

export async function getUserPayload(request: NextRequest): Promise<AuthPayload | null> {
  const token = request.cookies.get("token")?.value;
  if (!token) return null;
  
  const payload = await verifyToken(token);
  return payload as AuthPayload | null;
}

export async function checkProjectAccess(request: NextRequest, projectId: string, requiredRoles?: string[]): Promise<boolean> {
  const payload = await getUserPayload(request);
  if (!payload) return false;

  // Admin has access to all projects
  if (payload.role === "ADMIN") return true;

  const projectRole = payload.projectRoles?.[projectId];
  if (!projectRole) return false;

  // If specific roles are required, check against them
  if (requiredRoles && requiredRoles.length > 0) {
    return requiredRoles.includes(projectRole);
  }

  return true;
}
