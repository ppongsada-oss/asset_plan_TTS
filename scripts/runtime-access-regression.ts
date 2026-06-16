import assert from "node:assert/strict";

type Credentials = {
  email: string;
  password: string;
};

type Session = {
  label: string;
  cookie: string;
};

const baseUrl = process.env.TEST_BASE_URL || "http://localhost:3000";
const credentials = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || "admin@asset.com",
    password: process.env.TEST_ADMIN_PASSWORD || "123456",
  },
  center: {
    email: process.env.TEST_CENTER_EMAIL || "center@asset.com",
    password: process.env.TEST_CENTER_PASSWORD || "123456",
  },
  site: {
    email: process.env.TEST_SITE_EMAIL || "site@asset.com",
    password: process.env.TEST_SITE_PASSWORD || "123456",
  },
} satisfies Record<string, Credentials>;

async function login(label: string, creds: Credentials): Promise<Session> {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(creds),
  });

  assert.equal(response.status, 200, `${label} login failed with ${response.status}`);

  const cookie = response.headers.get("set-cookie");
  assert.ok(cookie, `${label} login did not return a session cookie`);

  return {
    label,
    cookie: cookie.split(";")[0],
  };
}

async function requestJson(session: Session, path: string, expectedStatus: number) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      cookie: session.cookie,
    },
  });

  assert.equal(
    response.status,
    expectedStatus,
    `${session.label} expected ${expectedStatus} for ${path}, got ${response.status}`
  );

  return response.json();
}

async function main() {
  const admin = await login("admin", credentials.admin);
  const center = await login("store-center", credentials.center);
  const site = await login("site-user", credentials.site);

  await requestJson(admin, "/api/admin/projects", 200);
  await requestJson(center, "/api/center/requests?limit=1&type=RETURN", 200);
  await requestJson(center, "/api/admin/projects", 403);
  const siteProjects = await requestJson(site, "/api/projects", 200);
  await requestJson(site, "/api/admin/projects", 403);
  await requestJson(site, "/api/center/requests?limit=1&type=RETURN", 403);

  assert.ok(Array.isArray(siteProjects.data), "site-user /api/projects did not return an array");

  console.log(
    [
      `[runtime-access] base=${baseUrl}`,
      `[runtime-access] admin:/api/admin/projects=200`,
      `[runtime-access] center:/api/center/requests=200`,
      `[runtime-access] site:/api/projects=${siteProjects.data.length} rows`,
    ].join("\n")
  );
}

main().catch((error) => {
  console.error("[runtime-access] FAIL");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
