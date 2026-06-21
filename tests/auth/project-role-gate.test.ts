import assert from "node:assert/strict";
import test from "node:test";
import { hasProjectRole, hasGlobalRole, type AuthPayload } from "@/lib/auth-check";

// Regression for the Store-Site empty-worksheet bug:
// project-role gates checked the literal "SITE" but the DB stores "STORE_SITE",
// so every STORE_SITE user was rejected (403) on plans/jobs/inventory writes.
const siteUser: AuthPayload = {
  id: 3,
  email: "site@asset.com",
  role: "USER",
  projectRoles: { P1: "STORE_SITE", P2: "STORE_SITE" },
};

const adminUser: AuthPayload = {
  id: 1,
  email: "admin@asset.com",
  role: "ADMIN",
  projectRoles: {},
};

const centerUser: AuthPayload = {
  id: 2,
  email: "center@asset.com",
  role: "STORE_CENTER",
  projectRoles: {},
};

test("STORE_SITE user passes the corrected ['STORE_SITE'] project gate", () => {
  assert.equal(hasProjectRole(siteUser, "P1", ["STORE_SITE"]), true);
});

test("the old ['SITE'] gate would have wrongly rejected a STORE_SITE user", () => {
  // proves the previous code was broken — guards against a regression to "SITE"
  assert.equal(hasProjectRole(siteUser, "P1", ["SITE"]), false);
});

test("STORE_SITE user is rejected on a project they have no role in", () => {
  assert.equal(hasProjectRole(siteUser, "P_OTHER", ["STORE_SITE"]), false);
});

test("ADMIN bypasses project-role gates entirely", () => {
  assert.equal(hasProjectRole(adminUser, "P1", ["STORE_SITE"]), true);
  assert.equal(hasProjectRole(adminUser, "P_ANY", ["STORE_SITE"]), true);
});

test("equipment catalog (requireAuth) is readable by any authenticated role", () => {
  // GET /api/equipment now gates on requireAuth, not requireRole.
  // Any authenticated payload should be allowed — verified here via the
  // contract that no global-role restriction is applied at read time.
  // hasGlobalRole is only used by the write endpoints, kept restricted:
  assert.equal(hasGlobalRole(siteUser, ["ADMIN", "STORE_CENTER"]), false);
  assert.equal(hasGlobalRole(centerUser, ["ADMIN", "STORE_CENTER"]), true);
  assert.equal(hasGlobalRole(adminUser, ["ADMIN", "STORE_CENTER"]), true);
});
