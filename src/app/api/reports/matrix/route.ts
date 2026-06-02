import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { equipment_items, project_inventory, project_plans, projects, planning_cycles, planning_jobs, center_decisions } from "@/db/schema";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq, and, inArray, desc } from "drizzle-orm";


export async function GET(request: NextRequest) {
  try {
    const env = getCloudflareContext().env;
    const db = getDb(env as any);
    const kv = (env as any).CACHE_KV;

    const searchParams = request.nextUrl.searchParams;
    const cycleIdParam = searchParams.get("cycleId");
    const monthsParam = searchParams.get("months");
    const showArchived = searchParams.get("showArchived") === "true";

    // 1. Fetch cycles and projects
    const cycles = await db.select().from(planning_cycles).orderBy(desc(planning_cycles.created_at));
    const allProjectsRaw = await db.select().from(projects);
    const filteredProjects = showArchived ? allProjectsRaw : allProjectsRaw.filter(p => p.status === "ACTIVE");
    
    const sites = filteredProjects.filter(p => p.type?.toUpperCase() === "SITE");
    const warehouses = filteredProjects.filter(p => p.type?.toUpperCase() === "WAREHOUSE");
    
    const siteIds = sites.map(s => s.id);
    const warehouseIds = warehouses.map(w => w.id);
    const allProjectIds = [...siteIds, ...warehouseIds];

    const projectMapping = filteredProjects.map(p => ({ id: p.id, name: p.name }));

    let activeCycleId = cycleIdParam ? parseInt(cycleIdParam) : (cycles[0]?.id || null);
    let activeMonths: string[] = [];

    if (monthsParam) {
      activeMonths = monthsParam.split(",");
    } else if (activeCycleId) {
      const activeCycle = cycles.find(c => c.id === activeCycleId);
      if (activeCycle) {
        try {
          activeMonths = JSON.parse(activeCycle.target_months);
        } catch {
          activeMonths = [];
        }
      }
    }

    const cacheKey = `matrix_report_v3_c${activeCycleId}_m${activeMonths.join("-")}_a${showArchived}`;

    if (kv) {
      const cached = await kv.get(cacheKey, "json");
      if (cached) {
        console.log("[API] Matrix Report v3 served from Cache:", cacheKey);
        return NextResponse.json({ ...cached, fromCache: true, cycles, projectMapping });
      }
    }

    console.log("[API] Matrix Report v3: Cache miss, calculating...", cacheKey);

    const equipments = await db.select().from(equipment_items);
    
    // Fetch inventory
    const inventory = allProjectIds.length > 0 
      ? await db.select().from(project_inventory).where(inArray(project_inventory.project_id, allProjectIds))
      : [];

    // Fetch plans (Only for Sites)
    let plans: any[] = [];
    if (siteIds.length > 0 && activeCycleId && activeMonths.length > 0) {
      plans = await db.select({
        id: project_plans.id,
        project_id: project_plans.project_id,
        equipment_id: project_plans.equipment_id,
        month: project_plans.month,
        required_qty: project_plans.required_qty,
        status: project_plans.status
      })
      .from(project_plans)
      .innerJoin(planning_jobs, eq(project_plans.job_id, planning_jobs.id))
      .where(and(
        inArray(project_plans.status, ["APPROVED", "PROCURED"]),
        eq(planning_jobs.cycle_id, activeCycleId),
        inArray(project_plans.month, activeMonths),
        inArray(project_plans.project_id, siteIds)
      ));
    }

    const planIds = plans.map(p => p.id);
    const decisions = planIds.length > 0
      ? await db.select().from(center_decisions).where(inArray(center_decisions.plan_id, planIds))
      : [];

    // Get list of projects that are APPROVED for this cycle
    const approvedJobs = activeCycleId
      ? await db.select({ project_id: planning_jobs.project_id })
          .from(planning_jobs)
          .where(and(
            eq(planning_jobs.cycle_id, activeCycleId),
            inArray(planning_jobs.status, ["APPROVED", "CLOSED"])
          ))
      : [];
    const approvedProjectIds = new Set(approvedJobs.map(j => j.project_id));

    const matrixMap: Record<number, any> = {};
    equipments.forEach(eq => {
      matrixMap[eq.id] = {
        id: eq.id,
        code: eq.item_code,
        name: eq.name,
        sites: {} as Record<string, number>,
        warehouses: {} as Record<string, number>,
        totalInventorySites: 0,
        totalInventoryWarehouses: 0,
        totalDemand: 0,
        totalReturns: 0,
        pendingDemand: 0,
        actions: {
          dispatch: 0,
          circulate: 0,
          substitute: 0,
          buy: 0,
          rent: 0,
          receive: 0,
          reject: 0
        },
        pendingReceipt: 0,
        details: {
          demands: [] as any[],
          returns: [] as any[],
          dispatch: [] as any[],
          circulate: [] as any[],
          substitute: [] as any[],
          buy: [] as any[],
          rent: [] as any[],
          receive: [] as any[],
          reject: [] as any[],
          pendingDemands: [] as any[],
          pendingReceipts: [] as any[]
        }
      };
      siteIds.forEach(p => matrixMap[eq.id].sites[p] = 0);
      warehouseIds.forEach(p => matrixMap[eq.id].warehouses[p] = 0);
    });

    // Helper for aggregated details
    const addDetail = (array: any[], projectId: string, qty: number, month?: string) => {
      let existing = array.find(a => a.project === projectId);
      if (!existing) {
        existing = { project: projectId, qty: 0, breakdown: {} };
        array.push(existing);
      }
      existing.qty += qty;
      if (month) {
        existing.breakdown[month] = (existing.breakdown[month] || 0) + qty;
      }
    };

    // Create a mapping for inventory lookup
    const invLookup: Record<string, Record<number, number>> = {};
    inventory.forEach(inv => {
      if (!invLookup[inv.project_id]) invLookup[inv.project_id] = {};
      invLookup[inv.project_id][inv.equipment_id] = inv.qty;

      const row = matrixMap[inv.equipment_id];
      if (row) {
        if (warehouseIds.includes(inv.project_id)) {
          row.warehouses[inv.project_id] = inv.qty;
          row.totalInventoryWarehouses += inv.qty;
        } else {
          row.totalInventorySites += inv.qty;
        }
      }
    });

    // Calculate Peak Demands and Returns (ONLY SITES)
    const groupedPlans: Record<string, any[]> = {};
    plans.forEach(p => {
      const key = `${p.project_id}-${p.equipment_id}`;
      if (!groupedPlans[key]) groupedPlans[key] = [];
      groupedPlans[key].push(p);
    });

    const siteEqPairs = new Set<string>();
    for (const key in groupedPlans) siteEqPairs.add(key);
    inventory.filter(i => siteIds.includes(i.project_id)).forEach(inv => siteEqPairs.add(`${inv.project_id}-${inv.equipment_id}`));

    siteEqPairs.forEach(pairKey => {
      const [projId, eqIdStr] = pairKey.split("-");
      const eqId = parseInt(eqIdStr);
      const row = matrixMap[eqId];
      if (!row) return;

      const pPlans = groupedPlans[pairKey] || [];
      const currentInv = invLookup[projId]?.[eqId] || 0;
      
      const peakPlan = pPlans.length > 0 ? Math.max(...pPlans.map(p => p.required_qty)) : 0;
      
      // Always show in individual site columns
      row.sites[projId] = peakPlan;

      // Only count towards summary metrics if approved
      if (approvedProjectIds.has(projId)) {
        const netDemand = Math.max(0, peakPlan - currentInv);
        const excess = currentInv > peakPlan ? currentInv - peakPlan : 0;
        
        row.totalDemand += netDemand;
        
        if (peakPlan > 0 || currentInv > 0) {
          const breakdown: Record<string, number> = {};
          pPlans.forEach(p => breakdown[p.month] = p.required_qty);
          row.details.demands.push({ 
            project: projId, 
            qty: netDemand, 
            grossRequired: peakPlan,
            expectedReturn: excess,
            initialInventory: currentInv,
            breakdown 
          });
        }

        if (currentInv > peakPlan) {
          row.totalReturns += excess;
          row.details.returns.push({ project: projId, qty: excess });
        }
      }
    });

    // Process Decisions (Actions and Receipts)
    decisions.forEach(d => {
      const plan = plans.find(p => p.id === d.plan_id);
      if (!plan) return;
      
      // Only include actions for approved projects in summary
      if (!approvedProjectIds.has(plan.project_id)) return;

      const row = matrixMap[plan.equipment_id];
      if (!row) return;

      const type = d.action_type;
      const qty = d.qty || 0;

      // Grouping and Detail Mapping
      if (type === "DISPATCH") {
        row.actions.dispatch += qty;
        addDetail(row.details.dispatch, plan.project_id, qty, plan.month);
      } else if (type === "CIRCULATE") {
        row.actions.circulate += qty;
        addDetail(row.details.circulate, plan.project_id, qty, plan.month);
      } else if (type === "SUBSTITUTE") {
        row.actions.substitute += qty;
        addDetail(row.details.substitute, plan.project_id, qty, plan.month);
      } else if (type === "BUY") {
        row.actions.buy += qty;
        addDetail(row.details.buy, plan.project_id, qty, plan.month);
      } else if (type === "RENT") {
        row.actions.rent += qty;
        addDetail(row.details.rent, plan.project_id, qty, plan.month);
      } else if (type === "RECEIVE") {
        row.actions.receive += qty;
        addDetail(row.details.receive, plan.project_id, qty, plan.month);
      } else if (type === "REJECT_RETURN") {
        row.actions.reject += qty;
        addDetail(row.details.reject, plan.project_id, qty, plan.month);
      }
    });

    // Final Pending Demand and Receipt Calculation:
    Object.values(matrixMap).forEach((row: any) => {
      let netDemandBeforeDecisions = 0;
      siteIds.forEach(p => {
        if (!approvedProjectIds.has(p)) return; // Only count approved projects for summary demand
        const peakPlan = row.sites[p] || 0;
        const currentInv = invLookup[p]?.[row.id] || 0;
        netDemandBeforeDecisions += Math.max(0, peakPlan - currentInv);
      });

      const totalSupplyDecided = row.actions.dispatch + row.actions.circulate + row.actions.substitute + row.actions.buy + row.actions.rent;
      row.pendingDemand = Math.max(0, netDemandBeforeDecisions - totalSupplyDecided);
      
      // Calculate Pending Demand details for tooltip
      siteIds.forEach(p => {
        if (!approvedProjectIds.has(p)) return; // Only for approved projects
        
        const peakPlan = row.sites[p] || 0;
        const currentInv = invLookup[p]?.[row.id] || 0;

        // Filter supply decisions for this project to calculate original gap
        const projectDispatched = row.details.dispatch.filter((d: any) => d.project === p).reduce((sum: number, d: any) => sum + d.qty, 0);
        const projectCirculated = row.details.circulate.filter((d: any) => d.project === p).reduce((sum: number, d: any) => sum + d.qty, 0);
        const projectSubstituted = row.details.substitute.filter((d: any) => d.project === p).reduce((sum: number, d: any) => sum + d.qty, 0);
        const projectBought = row.details.buy.filter((d: any) => d.project === p).reduce((sum: number, d: any) => sum + d.qty, 0);
        const projectRented = row.details.rent.filter((d: any) => d.project === p).reduce((sum: number, d: any) => sum + d.qty, 0);
        const projectTotalSupplied = projectDispatched + projectCirculated + projectSubstituted + projectBought + projectRented;

        // Original Gap = what was needed at the start of this cycle
        const originalNetGap = Math.max(0, peakPlan - currentInv);
        
        if (peakPlan > 0 || projectTotalSupplied > 0) {
          const projectPending = Math.max(0, originalNetGap - projectTotalSupplied);
          row.details.pendingDemands.push({
            project: p,
            qty: projectPending,
            breakdown: {
              "Required": peakPlan,
              "Supplied": projectTotalSupplied,
              "Pending": projectPending
            }
          });
        }
      });

      // Pending Receipt = Original Excess - Handled Returns (Receive + Reject)
      // Since row.totalReturns is calculated from baseline inventory, it already represents Original Excess
      const originalExcessTotal = row.totalReturns;
      const handledReturnsTotal = row.actions.receive + row.actions.reject;
      row.pendingReceipt = Math.max(0, originalExcessTotal - handledReturnsTotal);

      // Calculate Pending Receipt details for tooltip
      siteIds.forEach(p => {
        if (!approvedProjectIds.has(p)) return; // Only for approved projects

        const currentInv = invLookup[p]?.[row.id] || 0;
        const peakPlan = row.sites[p] || 0;
        
        // Filter decisions for this project
        const projectReceived = row.details.receive.filter((r: any) => r.project === p).reduce((sum: number, r: any) => sum + r.qty, 0);
        const projectRejected = row.details.reject.filter((r: any) => r.project === p).reduce((sum: number, r: any) => sum + r.qty, 0);
        
        // Original Excess = what was excess at the start of this cycle
        const projectOriginalExcess = Math.max(0, currentInv - peakPlan);
        
        if (projectOriginalExcess > 0 || projectReceived > 0 || projectRejected > 0) {
          const projectPending = Math.max(0, projectOriginalExcess - (projectReceived + projectRejected));
          
          row.details.pendingReceipts.push({ 
            project: p, 
            qty: projectPending,
            breakdown: {
              "Excess": projectOriginalExcess,
              "Received": projectReceived,
              "Rejected": projectRejected,
              "Pending": projectPending
            }
          });
        }
      });
    });

    const result = Object.values(matrixMap);
    const finalData = { 
      success: true, 
      projects: { sites: siteIds.sort(), warehouses: warehouseIds.sort() },
      projectMapping,
      matrix: result,
      activeCycleId,
      activeMonths
    };

    if (kv) {
      await kv.put(cacheKey, JSON.stringify(finalData), { expirationTtl: 300 });
      console.log("[API] Matrix Report v3 saved to Cache:", cacheKey);
    }
    
    return NextResponse.json({ ...finalData, cycles });
  } catch(error: any) {
    console.error(error);
    return NextResponse.json({ success: false, error: "Failed to fetch matrix: " + error.message }, { status: 500 });
  }
}
