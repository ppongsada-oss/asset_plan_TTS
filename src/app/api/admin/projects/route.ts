import { NextResponse } from "next/server";
// Re-build trigger: fixing import db -> getDb
import { getDb, type Env } from "@/db";
import { projects, project_inventory, equipment_items } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth-check";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ADMIN_PROJECTS_CACHE_KEY, invalidateCache } from "@/lib/cache";

type ProjectMutationBody = {
  id?: string;
  name?: string;
  type?: "SITE" | "WAREHOUSE";
  status?: "ACTIVE" | "ARCHIVED";
};

type AdminProjectRow = {
  id: string;
  name: string;
  type: "SITE" | "WAREHOUSE";
  status: "ACTIVE" | "ARCHIVED";
  created_at: string;
  site_assets_count: number;
  inventory_list: string | null;
};

type InventorySnapshotRow = {
  project_id: string;
  equipment_id: number;
  cycle_id: number | null;
  qty: number;
  item_name: string;
};

export async function GET(req: Request) {
  const auth = await requireRole(req, ["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const env = getCloudflareContext().env as Env;
    const db = getDb(env);
    const kv = env.CACHE_KV;

    const cached = await kv?.get(ADMIN_PROJECTS_CACHE_KEY, "json") as { success: true; data: AdminProjectRow[] } | null;
    if (cached) {
      return NextResponse.json(cached);
    }

    const projectRows = await db.select({
      id: projects.id,
      name: projects.name,
      type: projects.type,
      status: projects.status,
      created_at: projects.created_at,
    })
    .from(projects)
    .orderBy(sql`${projects.status} ASC, ${projects.id} ASC`);

    const inventoryRows = await db.select({
      project_id: project_inventory.project_id,
      equipment_id: project_inventory.equipment_id,
      cycle_id: project_inventory.cycle_id,
      qty: project_inventory.qty,
      item_name: equipment_items.name,
    })
    .from(project_inventory)
    .innerJoin(equipment_items, eq(project_inventory.equipment_id, equipment_items.id))
    .orderBy(
      project_inventory.project_id,
      project_inventory.equipment_id,
      sql`COALESCE(${project_inventory.cycle_id}, -1) DESC`,
      sql`${project_inventory.id} DESC`
    ) as InventorySnapshotRow[];

    const latestInventoryByProject = new Map<string, { name: string; qty: number }[]>();
    const seenKeys = new Set<string>();

    for (const row of inventoryRows) {
      const dedupeKey = `${row.project_id}::${row.equipment_id}`;
      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);
      if (row.qty <= 0) continue;

      const projectItems = latestInventoryByProject.get(row.project_id) || [];
      projectItems.push({ name: row.item_name, qty: row.qty });
      latestInventoryByProject.set(row.project_id, projectItems);
    }

    const data: AdminProjectRow[] = projectRows.map((project) => {
      const inventoryList = (latestInventoryByProject.get(project.id) || [])
        .sort((a, b) => a.name.localeCompare(b.name, "th"));

      return {
        ...project,
        created_at: project.created_at || "",
        site_assets_count: inventoryList.length,
        inventory_list: JSON.stringify(inventoryList),
      };
    });

    const payload = { success: true, data };
    await kv?.put(ADMIN_PROJECTS_CACHE_KEY, JSON.stringify(payload), { expirationTtl: 120 });

    return NextResponse.json(payload);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const env = getCloudflareContext().env as Env;
    const db = getDb(env);
    const { id, name, type, status } = (await req.json()) as ProjectMutationBody;

    if (!id || !name || !type) {
      return NextResponse.json({ error: "id, name, type are required" }, { status: 400 });
    }
    if (!["SITE", "WAREHOUSE"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    await db.insert(projects).values({
      id: String(id).trim().toUpperCase(),
      name: String(name).trim(),
      type: type as "SITE" | "WAREHOUSE",
      status: (status || "ACTIVE") as "ACTIVE" | "ARCHIVED",
    });

    await invalidateCache(env.CACHE_KV);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const auth = await requireRole(req, ["ADMIN"]);
  if (!auth.ok) return auth.response;

  try {
    const env = getCloudflareContext().env as Env;
    const db = getDb(env);
    const { id, status, name, type } = (await req.json()) as ProjectMutationBody;
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    const updateData: Partial<Pick<ProjectMutationBody, "status" | "name" | "type">> = {};
    if (status) updateData.status = status;
    if (name) updateData.name = name;
    if (type) updateData.type = type;

    await db.update(projects).set(updateData).where(eq(projects.id, id));
    await invalidateCache(env.CACHE_KV);
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
