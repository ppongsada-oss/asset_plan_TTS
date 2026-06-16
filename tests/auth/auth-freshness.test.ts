import assert from "node:assert/strict";
import test from "node:test";
import { resolveAuthPayload, type AuthResolverDeps } from "@/lib/auth-check";

test("resolveAuthPayload rehydrates role and project access from the database", async () => {
  const calls: Array<string> = [];
  const deps: AuthResolverDeps = {
    verifyToken: async () => {
      calls.push("verify");
      return {
        id: 7,
        email: "stale@asset.com",
        role: "ADMIN",
        projectRoles: { OLD: "PROJECT_MANAGER" },
      };
    },
    findUserById: async (id) => {
      calls.push(`user:${id}`);
      return {
        id,
        email: "live@asset.com",
        global_role: "USER",
      };
    },
    findProjectRoles: async (userId) => {
      calls.push(`roles:${userId}`);
      return [
        { project_id: "P1", role: "STORE_SITE" },
        { project_id: "P2", role: "VIEWER" },
      ];
    },
  };

  const payload = await resolveAuthPayload("signed-token", deps);

  assert.deepEqual(calls, ["verify", "user:7", "roles:7"]);
  assert.deepEqual(payload, {
    id: 7,
    email: "live@asset.com",
    role: "USER",
    projectRoles: {
      P1: "STORE_SITE",
      P2: "VIEWER",
    },
  });
});

test("resolveAuthPayload rejects tokens without the required identity claims", async () => {
  const deps: AuthResolverDeps = {
    verifyToken: async () => ({ role: "ADMIN" }),
    findUserById: async () => {
      throw new Error("should not load user");
    },
    findProjectRoles: async () => {
      throw new Error("should not load roles");
    },
  };

  const payload = await resolveAuthPayload("bad-token", deps);

  assert.equal(payload, null);
});

test("resolveAuthPayload returns null when the live user no longer exists", async () => {
  const deps: AuthResolverDeps = {
    verifyToken: async () => ({ id: 99, email: "deleted@asset.com" }),
    findUserById: async () => null,
    findProjectRoles: async () => {
      throw new Error("should not load roles");
    },
  };

  const payload = await resolveAuthPayload("deleted-user-token", deps);

  assert.equal(payload, null);
});
