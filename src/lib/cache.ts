export const MATRIX_REPORT_CACHE_PREFIX = "matrix_report_v3_";
export const CENTER_REQUESTS_CACHE_PREFIX = "center_requests_v1_";
export const CENTER_CYCLES_CACHE_KEY = "center_cycles_v1";
export const DASHBOARD_ALERTS_CACHE_KEY = "dashboard_alerts";
export const ADMIN_PROJECTS_CACHE_KEY = "admin_projects_v1";
export const PROJECTS_CACHE_PREFIX = "projects_v1_";
export const PROJECT_ROLES_CACHE_KEY = "project_roles_v1";
export const USERS_CACHE_KEY = "users_v1";
export const EQUIPMENT_CACHE_KEY = "equipment_v1";
export const SITE_JOBS_CACHE_PREFIX = "site_jobs_v1_";
export const SITE_JOB_DETAIL_CACHE_PREFIX = "site_job_detail_v1_";
export const SITE_PLANS_CACHE_PREFIX = "site_plans_v1_";
export const SITE_INVENTORY_CACHE_PREFIX = "site_inventory_v1_";

type CacheListResult = {
  keys?: Array<{ name: string }>;
  list_complete: boolean;
  cursor?: string;
};

type KvLike = {
  delete: (key: string) => Promise<void>;
  list: (options: { prefix: string; cursor?: string }) => Promise<CacheListResult>;
};

const deleteByPrefix = async (kv: KvLike, prefix: string) => {
  let listComplete = false;
  let cursor: string | undefined;
  let invalidatedCount = 0;

  while (!listComplete) {
    const result = await kv.list({ prefix, cursor });
    if (result.keys && result.keys.length > 0) {
      await Promise.all(result.keys.map((key) => kv.delete(key.name)));
      invalidatedCount += result.keys.length;
    }
    listComplete = result.list_complete;
    cursor = result.cursor;
  }

  return invalidatedCount;
};

export function getCenterRequestsCacheKey(params: {
  page: number;
  limit: number;
  search: string;
  status: string;
  type: string;
  month: string;
  cycleId: number | null;
}) {
  const normalized = {
    ...params,
    search: encodeURIComponent(params.search || ""),
    month: encodeURIComponent(params.month || ""),
    status: encodeURIComponent(params.status || "ALL"),
    type: encodeURIComponent(params.type || "DEMAND"),
  };

  const cycleScope = normalized.cycleId ? `c${normalized.cycleId}` : "call";
  return `${CENTER_REQUESTS_CACHE_PREFIX}${cycleScope}_t${normalized.type}_s${normalized.status}_m${normalized.month || "all"}_q${normalized.search || "all"}_p${normalized.page}_l${normalized.limit}`;
}

export function getProjectsCacheKey(role: string, accessibleIds: string[]) {
  if (role === "ADMIN" || role === "STORE_CENTER") {
    return `${PROJECTS_CACHE_PREFIX}${role.toLowerCase()}_all`;
  }

  const scopedIds = [...accessibleIds].sort().join(",");
  return `${PROJECTS_CACHE_PREFIX}${role.toLowerCase()}_${encodeURIComponent(scopedIds || "none")}`;
}

export function getSiteJobsCacheKey(role: string, accessibleIds: string[], projectId: string | null) {
  const scope = projectId && projectId !== "ALL"
    ? projectId
    : [...accessibleIds].sort().join(",") || "all";
  return `${SITE_JOBS_CACHE_PREFIX}${role.toLowerCase()}_${encodeURIComponent(scope)}`;
}

export const getSiteJobDetailCacheKey = (jobId: number) => `${SITE_JOB_DETAIL_CACHE_PREFIX}${jobId}`;
export const getSitePlansCacheKey = (jobId: number) => `${SITE_PLANS_CACHE_PREFIX}${jobId}`;
export const getSiteInventoryCacheKey = (projectId: string) => `${SITE_INVENTORY_CACHE_PREFIX}${encodeURIComponent(projectId)}`;

export async function invalidateCache(kv: KvLike | null | undefined, cycleId?: number) {
  if (!kv) return;

  try {
    const prefixes = cycleId && Number.isFinite(cycleId)
      ? [
          `${MATRIX_REPORT_CACHE_PREFIX}c${cycleId}_`,
          `${CENTER_REQUESTS_CACHE_PREFIX}c${cycleId}_`,
          `${CENTER_REQUESTS_CACHE_PREFIX}call_`,
        ]
      : [
          MATRIX_REPORT_CACHE_PREFIX,
          CENTER_REQUESTS_CACHE_PREFIX,
        ];

    const counts = await Promise.all(prefixes.map((prefix) => deleteByPrefix(kv, prefix)));

    await Promise.all([
      kv.delete(CENTER_CYCLES_CACHE_KEY),
      kv.delete(DASHBOARD_ALERTS_CACHE_KEY),
      kv.delete(ADMIN_PROJECTS_CACHE_KEY),
      kv.delete(PROJECT_ROLES_CACHE_KEY),
      kv.delete(USERS_CACHE_KEY),
      kv.delete(EQUIPMENT_CACHE_KEY),
    ]);

    await Promise.all([
      deleteByPrefix(kv, PROJECTS_CACHE_PREFIX),
      deleteByPrefix(kv, SITE_JOBS_CACHE_PREFIX),
      deleteByPrefix(kv, SITE_JOB_DETAIL_CACHE_PREFIX),
      deleteByPrefix(kv, SITE_PLANS_CACHE_PREFIX),
      deleteByPrefix(kv, SITE_INVENTORY_CACHE_PREFIX),
    ]);

    console.log(
      `[Cache Invalidation] prefixes=${prefixes.join(",")} counts=${counts.join(",")} + ${CENTER_CYCLES_CACHE_KEY} + ${DASHBOARD_ALERTS_CACHE_KEY} + ${ADMIN_PROJECTS_CACHE_KEY} + ${PROJECTS_CACHE_PREFIX} + ${PROJECT_ROLES_CACHE_KEY} + ${USERS_CACHE_KEY} + ${EQUIPMENT_CACHE_KEY} + ${SITE_JOBS_CACHE_PREFIX} + ${SITE_JOB_DETAIL_CACHE_PREFIX} + ${SITE_PLANS_CACHE_PREFIX} + ${SITE_INVENTORY_CACHE_PREFIX}`
    );
  } catch (error) {
    console.error("[Cache Invalidation] Failed to invalidate cache:", error);
  }
}
