import { NextResponse } from "next/server";
// Re-build trigger: fixing import db -> getDb
import { getDb } from "@/db";
import { projects, project_inventory, equipment_items } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { getCloudflareContext } from "@opennextjs/cloudflare";


async function getAuth(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function GET(req: Request) {
  const user = await getAuth(req);
  if (!user || (user.role !== "ADMIN" && user.role !== "STORE_CENTER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const env = getCloudflareContext().env;
    const db = getDb(env as any);
    const data = await db.select({
      id: projects.id,
      name: projects.name,
      type: projects.type,
      status: projects.status,
      created_at: projects.created_at,
      site_assets_count: sql<number>`CAST(count(DISTINCT ${project_inventory.equipment_id}) FILTER (WHERE ${project_inventory.qty} > 0) AS INTEGER)`,
      inventory_list: sql<string>`(
        SELECT json_group_array(json_object('name', ${equipment_items.name}, 'qty', ${project_inventory.qty}))
        FROM ${project_inventory}
        JOIN ${equipment_items} ON ${project_inventory.equipment_id} = ${equipment_items.id}
        WHERE ${project_inventory.project_id} = ${projects.id} AND ${project_inventory.qty} > 0
      )`
    })
    .from(projects)
    .leftJoin(project_inventory, eq(projects.id, project_inventory.project_id))
    .groupBy(projects.id)
    .orderBy(sql`${projects.status} ASC, ${projects.id} ASC`);
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const user = await getAuth(req);
  if (!user || (user.role !== "ADMIN" && user.role !== "STORE_CENTER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const env = getCloudflareContext().env;
    const db = getDb(env as any);
    const { id, status, name, type } = await req.json() as any;
    if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

    const updateData: any = {};
    if (status) updateData.status = status;
    if (name) updateData.name = name;
    if (type) updateData.type = type;

    await db.update(projects).set(updateData).where(eq(projects.id, id));
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
