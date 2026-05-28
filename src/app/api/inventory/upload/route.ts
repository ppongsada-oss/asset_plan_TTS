import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { equipment_items, projects, project_inventory } from "@/db/schema";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { read, utils } from "xlsx";
import { eq, inArray } from "drizzle-orm";
import { invalidateCache } from "@/lib/cache";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const env = getRequestContext().env;
    const db = getDb(env as any);

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "parse";
    const cycleId = searchParams.get("cycle_id");

    if (!cycleId) {
      return NextResponse.json({ success: false, error: "Missing cycle_id parameter" }, { status: 400 });
    }

    const parsedCycleId = parseInt(cycleId);

    // ACTION: CLEAR
    if (action === "clear") {
      await db.delete(project_inventory).where(eq(project_inventory.cycle_id, parsedCycleId));
      await invalidateCache(env.CACHE_KV);
      return NextResponse.json({ success: true });
    }

    // ACTION: INSERT (JSON Batch insert)
    if (action === "insert") {
      const body = (await request.json()) as any;
      const { inserts } = body;
      if (!inserts || !Array.isArray(inserts)) {
        return NextResponse.json({ success: false, error: "Missing inserts array" }, { status: 400 });
      }

      if (inserts.length > 0) {
        const d1 = env.DB as D1Database;
        
        // Chunk inserts into batches of 50 to avoid D1 parameter limits (50 * 4 = 200 parameters)
        const chunkSize = 50;
        for (let i = 0; i < inserts.length; i += chunkSize) {
          const chunk = inserts.slice(i, i + chunkSize);
          
          const placeholders = chunk.map(() => "(?, ?, ?, ?)").join(", ");
          const sqlStr = `INSERT INTO project_inventory (project_id, equipment_id, cycle_id, qty) VALUES ${placeholders}`;
          
          const params = chunk.flatMap((item: any) => [
            item.project_id,
            item.equipment_id,
            parsedCycleId,
            Number(item.qty) || 0
          ]);

          await d1.prepare(sqlStr).bind(...params).run();
        }
      }

      await invalidateCache(env.CACHE_KV);
      return NextResponse.json({ success: true });
    }

    // ACTION: PARSE (Default / legacy)
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    // Read XLSX
    const arrayBuffer = await file.arrayBuffer();
    const workbook = read(arrayBuffer, { type: "array" });
    const sheetName = "ST_StockRemainingReport_0";
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      return NextResponse.json({ 
        success: false, 
        error: `Sheet "${sheetName}" not found in Excel file.` 
      }, { status: 400 });
    }

    const rows = utils.sheet_to_json(worksheet) as any[];

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: "No data found in the sheet" }, { status: 400 });
    }

    // Get all projects and equipment for mapping
    const allProjects = await db.select({ id: projects.id }).from(projects);
    const allItems = await db.select({ id: equipment_items.id, item_code: equipment_items.item_code }).from(equipment_items);

    const projectMap = new Set(allProjects.map(p => p.id));
    const itemMap = new Map(allItems.map(i => [i.item_code, i.id]));

    const validInserts: { project_id: string; equipment_id: number; qty: number }[] = [];
    let skippedItems = 0;
    let skippedProjects = 0;

    for (const row of rows) {
      const locationCode = String(row["LocationCode"] || "");
      const itemMetaCode = String(row["ItemMetaCode"] || "");
      const qty = Number(row["QTYLine"]) || 0;

      if (!locationCode || !itemMetaCode) continue;

      const equipmentId = itemMap.get(itemMetaCode);
      const projectIdExists = projectMap.has(locationCode);

      if (!equipmentId) {
        skippedItems++;
        continue;
      }

      if (!projectIdExists) {
        skippedProjects++;
        continue;
      }

      validInserts.push({
        project_id: locationCode,
        equipment_id: equipmentId,
        qty: qty
      });
    }

    return NextResponse.json({
      success: true,
      validInserts,
      skippedItems,
      skippedProjects,
      totalRows: rows.length
    });

  } catch (error: any) {
    console.error("Inventory Upload Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to process inventory upload",
      details: error.message 
    }, { status: 500 });
  }
}
