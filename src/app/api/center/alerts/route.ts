import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { equipment_items, project_inventory, project_plans } from "@/db/schema";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";


export async function GET(request: NextRequest) {
  try {
    const env = getCloudflareContext().env;
    const db = getDb(env as any);
    const kv = (env as any).CACHE_KV;

    // 1. Check Cache
    if (kv) {
      const cached = await kv.get("dashboard_alerts", "json");
      if (cached) return NextResponse.json({ ...cached, fromCache: true });
    }

    // 2. Fetch data (Only approved plans first)
    const plans = await db.select().from(project_plans).where(eq(project_plans.status, "APPROVED"));
    
    if (plans.length === 0) {
      return NextResponse.json({ success: true, alerts: [] });
    }

    const equipments = await db.select().from(equipment_items);
    const inventory = await db.select().from(project_inventory);

    const demandGroups: Record<string, typeof plans> = {};
    plans.forEach(p => {
      const key = `${p.project_id}-${p.equipment_id}`;
      if (!demandGroups[key]) demandGroups[key] = [];
      demandGroups[key].push(p);
    });

    const netDemandPerEq: Record<number, number> = {};

    for (const key in demandGroups) {
      const g = demandGroups[key].sort((a,b) => a.month.localeCompare(b.month));
      const [proj, eqIdStr] = key.split("-");
      const eqId = parseInt(eqIdStr);
      
      const inv = inventory.find(i => i.project_id === proj && i.equipment_id === eqId);
      let currentMax = inv?.qty || 0;
      let netDemand = 0;
      
      g.forEach(plan => {
        if (plan.required_qty > currentMax) {
          netDemand += (plan.required_qty - currentMax);
          currentMax = plan.required_qty;
        }
      });

      if (!netDemandPerEq[eqId]) netDemandPerEq[eqId] = 0;
      netDemandPerEq[eqId] += netDemand;
    }

    const alerts: any[] = [];
    equipments.forEach(eq => {
      const demand = netDemandPerEq[eq.id] || 0;
      if (demand > eq.remaining_stock) {
        alerts.push({
          id: eq.id,
          code: eq.item_code,
          name: eq.name,
          demand: demand,
          stock: eq.remaining_stock,
          shortage: demand - eq.remaining_stock
        });
      }
    });

    const finalData = { success: true, alerts };
    
    // 3. Save to Cache
    if (kv) {
      await kv.put("dashboard_alerts", JSON.stringify(finalData), { expirationTtl: 300 });
    }

    return NextResponse.json(finalData);
  } catch(error) {
    console.error("Alerts Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch alerts" }, { status: 500 });
  }
}
