import SiteJobDashboard from "@/components/site-plan/SiteJobDashboard";
import { HardHat } from "lucide-react";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { projects as projectsTable } from "@/db/schema";
import { eq } from "drizzle-orm";


export default async function SitePlanPage({ searchParams }: { searchParams: Promise<{ project_id?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const initialProjectId = resolvedSearchParams?.project_id || "ALL";
  
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");

  const payload = await verifyToken(token) as any;
  if (!payload) redirect("/login");

  const globalRole = payload.role;
  let accessibleProjects: string[] = [];

  if (globalRole === "ADMIN" || globalRole === "STORE_CENTER") {
    const env = getCloudflareContext().env;
    const db = getDb(env as any);
    const allActive = await db.select({ id: projectsTable.id }).from(projectsTable).where(eq(projectsTable.status, "ACTIVE"));
    accessibleProjects = allActive.map(p => p.id);
  } else {
    accessibleProjects = Object.keys(payload.projectRoles || {});
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Page Context Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <HardHat size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {initialProjectId === "ALL" ? "All My Projects" : `Project: ${initialProjectId}`}
              </h1>
              <p className="text-sm text-slate-500">
                คุณกำลังดูใบงานวางแผนอุปกรณ์แยกตามโครงการ
              </p>
            </div>
          </div>
          
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 min-w-[200px]">
            <p className="text-xs text-slate-500 font-medium uppercase mb-1">สิทธิ์การใช้งาน</p>
            <div className="flex items-center gap-2 text-indigo-600 font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              {globalRole} {accessibleProjects.length > 0 ? `(${accessibleProjects.length} Projects)` : ""}
            </div>
          </div>
        </div>

        {/* Dynamic Matrix Component */}
        <SiteJobDashboard 
          initialProjectId={initialProjectId} 
          accessibleProjects={accessibleProjects} 
        />

      </div>
    </main>
  );
}
