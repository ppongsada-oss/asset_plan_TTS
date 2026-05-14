import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { equipment_items, projects, project_inventory } from "@/db/schema";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { read, utils } from "xlsx";
import { eq, inArray } from "drizzle-orm";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const env = getRequestContext().env;
    const db = getDb(env as any);

    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get("cycle_id");

    if (!cycleId) {
      return NextResponse.json({ success: false, error: "Missing cycle_id parameter" }, { status: 400 });
    }

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

    // 1. Get all projects and equipment for mapping
    const allProjects = await db.select({ id: projects.id }).from(projects);
    const allItems = await db.select({ id: equipment_items.id, item_code: equipment_items.item_code }).from(equipment_items);

    const projectMap = new Set(allProjects.map(p => p.id));
    const itemMap = new Map(allItems.map(i => [i.item_code, i.id]));

    const validInserts: { project_id: string; equipment_id: number; qty: number; cycle_id: number }[] = [];
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
        cycle_id: parseInt(cycleId),
        qty: qty
      });
    }

    if (validInserts.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: "No valid items matched the system. Check item codes and project IDs.",
        details: { skippedItems, skippedProjects }
      }, { status: 400 });
    }

    // 2. Clear existing project inventory for THIS CYCLE and insert new snapshot
    await db.delete(project_inventory).where(eq(project_inventory.cycle_id, parseInt(cycleId)));

    // D1 multi-row insert limitation: Insert one by one to be safe as per project rules (ERR-007)
    for (const insert of validInserts) {
      await db.insert(project_inventory).values(insert);
    }

    return NextResponse.json({
      success: true,
      message: `นำเข้าสำเร็จ: ${validInserts.length} รายการ | ข้ามรายการที่ไม่มีในระบบ: ${skippedItems} | ข้ามโครงการที่ไม่มีในระบบ: ${skippedProjects}`,
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
