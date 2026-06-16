import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { project_plans, project_inventory, equipment_items, center_decisions, projects, planning_jobs, planning_cycles } from "@/db/schema";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, or, inArray, and, sql } from "drizzle-orm";
import { requireRole } from "@/lib/auth-check";
import { getCenterRequestsCacheKey } from "@/lib/cache";


// Helper to handle SQLite's parameter limits (usually 999)
async function fetchInChunks(db: any, table: any, column: any, values: any[], selectedColumns?: any, additionalFilter?: any, chunkSize = 800) {
  if (values.length === 0) return [];
  
  const results = [];
  for (let i = 0; i < values.length; i += chunkSize) {
    const chunk = values.slice(i, i + chunkSize);
    const whereClause = additionalFilter 
      ? and(inArray(column, chunk), additionalFilter)
      : inArray(column, chunk);
    
    let query = db.select(selectedColumns || {}).from(table).where(whereClause);
    const part = await query;
    results.push(...part);
  }
  return results;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireRole(request, ["ADMIN", "STORE_CENTER"]);
    if (!auth.ok) return auth.response;

    const env = getCloudflareContext().env;
    const db = getDb(env as any);
    const kv = (env as any).CACHE_KV;

    const { searchParams: sp } = new URL(request.url);
    const page = parseInt(sp.get("page") || "1");
    const limit = parseInt(sp.get("limit") || "50");
    const search = sp.get("search")?.toLowerCase() || "";
    const status = sp.get("status") || "ALL";
    const type = sp.get("type") || "DEMAND";
    const month = sp.get("month") || "";
    const cycleIdParam = sp.get("cycle_id");
    const cycleIdNum = (cycleIdParam && !isNaN(parseInt(cycleIdParam))) ? parseInt(cycleIdParam) : null;
    const offset = (page - 1) * limit;
    const cacheKey = getCenterRequestsCacheKey({
      page,
      limit,
      search,
      status,
      type,
      month,
      cycleId: cycleIdNum,
    });

    if (kv) {
      const cached = await kv.get(cacheKey, "json");
      if (cached) {
        return NextResponse.json({ ...cached, fromCache: true });
      }
    }
    
    // 1. Fetch all projects associated with this cycle (even if no plans yet)
    let projectsInCycle: any[] = [];
    if (cycleIdNum) {
      projectsInCycle = await db.select({ project_id: planning_jobs.project_id })
        .from(planning_jobs)
        .where(eq(planning_jobs.cycle_id, cycleIdNum));
    }
    const cycleProjectIds = Array.from(new Set(projectsInCycle.map(p => p.project_id)));

    // 2. Fetch all plans (Approved or Procured)
    let query = db.select({
      id: project_plans.id,
      project_id: project_plans.project_id,
      project_code: projects.id,
      project_name: projects.name,
      equipment_id: project_plans.equipment_id,
      month: project_plans.month,
      required_qty: project_plans.required_qty,
      status: project_plans.status,
      item_name: equipment_items.name,
      item_code: equipment_items.item_code,
      remaining_stock: equipment_items.remaining_stock,
      unit: equipment_items.unit,
      job_id: project_plans.job_id,
      cycle_id: planning_jobs.cycle_id,
    })
    .from(project_plans)
    .leftJoin(equipment_items, eq(project_plans.equipment_id, equipment_items.id))
    .leftJoin(projects, eq(project_plans.project_id, projects.id))
    .leftJoin(planning_jobs, eq(project_plans.job_id, planning_jobs.id))
    .where(
      and(
        or(eq(project_plans.status, "APPROVED"), eq(project_plans.status, "PROCURED")),
        cycleIdNum ? eq(planning_jobs.cycle_id, cycleIdNum) : sql`1=1`
      )
    );

    const allPlans = await query;
    console.log(`[API] Total APPROVED/PROCURED plans found: ${allPlans.length}`);

    // 3. Extract unique Project IDs and Equipment IDs for filtering
    const planProjectIds = Array.from(new Set(allPlans.map(p => p.project_id).filter(Boolean)));
    const allRelevantProjectIds = Array.from(new Set([...planProjectIds, ...cycleProjectIds].filter(Boolean) as string[]));
    
    if (allRelevantProjectIds.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 4. Fetch all inventory for ALL relevant projects (include cycle_id for month lookup)
    const inventory = await fetchInChunks(
      db, 
      project_inventory,
      project_inventory.project_id,
      allRelevantProjectIds,
      {
        project_id: project_inventory.project_id,
        equipment_id: project_inventory.equipment_id,
        qty: project_inventory.qty,
        cycle_id: project_inventory.cycle_id
      },
      cycleIdNum ? eq(project_inventory.cycle_id, cycleIdNum) : undefined
    );

    // 5. Fetch all equipment items for fallback naming
    const allItems = await db.select().from(equipment_items);

    // 5b. Pre-fetch first target month for each cycle_id found in inventory
    //     (used for virtual RETURN rows that have no associated plan)
    const inventoryCycleIds = Array.from(new Set(
      inventory.map((i: any) => i.cycle_id).filter(Boolean)
    )) as number[];
    const cycleFirstMonthMap = new Map<number, string>();
    if (inventoryCycleIds.length > 0) {
      const cyclesForInv = await fetchInChunks(
        db,
        planning_cycles,
        planning_cycles.id,
        inventoryCycleIds,
        { id: planning_cycles.id, target_months: planning_cycles.target_months }
      );
      cyclesForInv.forEach((c: any) => {
        try {
          const months = JSON.parse(c.target_months);
          cycleFirstMonthMap.set(c.id, months[0] || "");
        } catch {}
      });
    }

    // 6. Fetch ONLY relevant decisions (Using chunking for safety)
    const allDecisions = await fetchInChunks(
      db,
      center_decisions,
      center_decisions.plan_id,
      allPlans.map(p => p.id),
      {
        id: center_decisions.id,
        plan_id: center_decisions.plan_id,
        action_type: center_decisions.action_type,
        qty: center_decisions.qty,
        notes: center_decisions.notes,
        created_at: center_decisions.created_at
      }
    );

    // 7. Map out ALL (project, equipment) pairs that have either inventory OR a plan
    const allPairs = new Set<string>();
    allPlans.forEach(p => allPairs.add(`${p.project_id}-${p.equipment_id}`));
    inventory.forEach(i => allPairs.add(`${i.project_id}-${i.equipment_id}`));

    const centerRequests = [];

    // Get first month of cycle for synthesized returns
    let firstMonth = "";
    if (cycleIdNum) {
      const cycleRows = await db.select().from(planning_cycles).where(eq(planning_cycles.id, cycleIdNum)).limit(1);
      const cycle = cycleRows[0];
      if (cycle) {
        try {
          const targetMonths = JSON.parse(cycle.target_months);
          firstMonth = targetMonths[0] || "";
        } catch (e) {
          console.error("Failed to parse target_months for cycle:", cycleIdNum, e);
        }
      }
    }

    // 8. Pre-fetch all project names to avoid N+1 query in loop
    const projectMap = new Map<string, string>();
    if (allRelevantProjectIds.length > 0) {
      const projectList = await fetchInChunks(
        db,
        projects,
        projects.id,
        allRelevantProjectIds,
        { id: projects.id, name: projects.name }
      );
      projectList.forEach((p: any) => projectMap.set(p.id, p.name));
    }

    for (const pairKey of allPairs) {
      const [projId, eqIdStr] = pairKey.split("-");
      const eqId = parseInt(eqIdStr);
      if (isNaN(eqId)) continue; // Safety check
      
      const plans = allPlans
        .filter(p => p.project_id === projId && p.equipment_id === eqId)
        .sort((a, b) => (a.month || "").localeCompare(b.month || ""));

      const inv = inventory.find(i => i.project_id === projId && i.equipment_id === eqId);
      let currentMax = inv?.qty || 0;

      // Case A: Has Inventory but NO PLAN entries in allPlans (Fully Return)
      if (plans.length === 0 && currentMax > 0) {
        const item = allItems.find(i => i.id === eqId);
        const projectName = projectMap.get(projId) || projId;
        
        // Determine month: use inventory's own cycle first month, then URL cycle's first month
        const invMonth = (inv?.cycle_id ? cycleFirstMonthMap.get(inv.cycle_id) : undefined) || firstMonth;
        centerRequests.push({
          id: `v-${projId}-${eqId}`, // Virtual ID for planless items
          equipment_id: eqId,
          cycle_id: cycleIdNum || inv?.cycle_id,
          project: projectName,
          project_code: projId,
          item_name: item?.name,
          item_code: item?.item_code,
          unit: item?.unit,
          month: invMonth,
          qty: currentMax,
          fulfilled_qty: 0, 
          status: "APPROVED",
          remaining_stock: item?.remaining_stock || 0,
          urgency: "Normal",
          decisions: [],
          type: "RETURN",
          required_qty: 0,
          current_inventory: currentMax
        });
        continue;
      }

      for (const plan of plans) {
        const decisions = allDecisions.filter(d => d.plan_id === plan.id);
        
        // Calculate decision sums
        const sumReceive = decisions.filter(d => d.action_type === "RECEIVE").reduce((sum, d) => sum + (d.qty || 0), 0);
        const sumReject = decisions.filter(d => d.action_type === "REJECT_RETURN").reduce((sum, d) => sum + (d.qty || 0), 0);
        const sumOther = decisions.filter(d => !["RECEIVE", "REJECT_RETURN"].includes(d.action_type)).reduce((sum, d) => sum + (d.qty || 0), 0);

        // A Return existed if currentMax > required_qty
        const originalReturnQty = currentMax - plan.required_qty;

        if (originalReturnQty > 0) {
          // It's a RETURN
          centerRequests.push({
            id: plan.id,
            equipment_id: plan.equipment_id,
            cycle_id: (plan as any).cycle_id, // Pass this through for filtering
            project: plan.project_name || plan.project_id,
            project_code: plan.project_code || plan.project_id,
            item_name: plan.item_name,
            item_code: plan.item_code,
            unit: plan.unit,
            month: plan.month,
            qty: originalReturnQty,
            fulfilled_qty: sumReceive, 
            status: plan.status,
            remaining_stock: plan.remaining_stock,
            urgency: "Normal",
            decisions: decisions,
            type: "RETURN",
            required_qty: plan.required_qty,
            current_inventory: currentMax
          });
          // Update currentMax for next month (moving forward)
          currentMax = plan.required_qty;
        } else if (plan.required_qty > currentMax) {
          // It's a DEMAND
          const delta = plan.required_qty - currentMax;
          centerRequests.push({
            id: plan.id,
            equipment_id: plan.equipment_id,
            cycle_id: (plan as any).cycle_id, // Pass this through for filtering
            project: plan.project_name || plan.project_id,
            project_code: plan.project_code || plan.project_id,
            item_name: plan.item_name,
            item_code: plan.item_code,
            unit: plan.unit,
            month: plan.month,
            qty: delta,
            fulfilled_qty: sumOther,
            status: plan.status,
            remaining_stock: plan.remaining_stock,
            urgency: delta > 2 ? "High" : "Normal",
            decisions: decisions,
            type: "DEMAND",
            required_qty: plan.required_qty,
            current_inventory: currentMax
          });
          currentMax = plan.required_qty;
        } else {
          // No change in demand, but still push it if it has decisions so it shows up in COMPLETED?
          // Actually, only push if it's a demand or return
          currentMax = plan.required_qty;
        }
      }
    }

    // Filter before pagination
    const allFiltered = centerRequests.map(req => {
      // If we have a cycle calibration for warehouse, use it instead of global stock
      if (cycleIdNum) {
        const whStock = inventory
          .filter(i => i.project_id.startsWith("WH") && i.equipment_id === req.equipment_id)
          .reduce((sum, i) => sum + i.qty, 0);
        
        // If we found any calibration for this item in warehouses, override remaining_stock
        if (inventory.some(i => i.project_id.startsWith("WH") && i.equipment_id === req.equipment_id)) {
          req.remaining_stock = whStock;
        }
      }
      return req;
    }).filter(req => {
      // 1. Cycle Filter (Crucial!)
      if (cycleIdNum && (req as any).cycle_id !== cycleIdNum) return false;

      // 2. Other Filters (Shared across types)
      const matchesSearch = !search || 
        req.item_name?.toLowerCase().includes(search) || 
        req.item_code?.toLowerCase().includes(search) || 
        req.project.toLowerCase().includes(search) || 
        (req as any).project_code?.toLowerCase().includes(search);
      
      const matchesMonth = !month || req.month === month;
      
      let matchesFilter = true;
      if (status === "READY") {
        matchesFilter = (req.remaining_stock ?? 0) >= (req.qty - req.fulfilled_qty) && req.fulfilled_qty < req.qty;
      } else if (status === "PENDING") {
        matchesFilter = req.fulfilled_qty < req.qty;
      } else if (status === "COMPLETED") {
        matchesFilter = req.fulfilled_qty >= req.qty;
      }
      
      return matchesSearch && matchesFilter && matchesMonth;
    });

    // Calculate counts for each type based on current filters
    const counts = {
      demand: allFiltered.filter(r => r.type === "DEMAND").length,
      return: allFiltered.filter(r => r.type === "RETURN").length
    };

    // Final filter by type for the actual returned data
    const filteredRequests = allFiltered.filter(req => req.type === type);

    const total = filteredRequests.length;
    const paginatedData = filteredRequests.slice(offset, offset + limit);

    console.log(`[API] Returning Page ${page} (${paginatedData.length}/${total} items) for search: "${search}", status: ${status}`);

    const responsePayload = {
      success: true, 
      data: paginatedData,
      counts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };

    if (kv) {
      await kv.put(cacheKey, JSON.stringify(responsePayload), { expirationTtl: 120 });
    }

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("GET Center Requests Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch center requests" }, { status: 500 });
  }
}
