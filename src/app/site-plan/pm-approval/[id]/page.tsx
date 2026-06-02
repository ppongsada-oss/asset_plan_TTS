import PMReviewTable from "@/components/site-plan/PMReviewTable";
import { UserCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getDb } from "@/db";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { planning_jobs, planning_cycles, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";


export default async function PMReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const jobId = parseInt(id);

  const env = getCloudflareContext().env;
  const db = getDb(env as any);
  
  const jobRows = await db.select({
    job: planning_jobs,
    cycle: planning_cycles,
    project: projects
  })
  .from(planning_jobs)
  .innerJoin(planning_cycles, eq(planning_jobs.cycle_id, planning_cycles.id))
  .innerJoin(projects, eq(planning_jobs.project_id, projects.id))
  .where(eq(planning_jobs.id, jobId))
  .limit(1);
  
  const jobData = jobRows[0];
  if (!jobData) {
    redirect("/site-plan/pm-approval");
  }

  const { job, cycle, project } = jobData;

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Page Context Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <Link href="/site-plan/pm-approval" className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <UserCheck size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight flex flex-col md:flex-row md:items-center gap-2">
                  <span className="text-slate-900">Review Project</span>
                  <span className="text-amber-600 bg-amber-50 px-4 py-1 rounded-2xl border border-amber-100 shadow-sm inline-block">
                    {project.name} <span className="text-amber-400 font-medium text-lg">({job.project_id})</span>
                  </span>
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  งวดงาน: <strong>{cycle.cycle_number}</strong> | รหัสอ้างอิง: <strong>{job.job_number}</strong>
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 min-w-[200px]">
            <p className="text-xs text-slate-500 font-medium uppercase mb-1">สถานะใบงาน</p>
            <div className={`flex items-center gap-2 font-bold text-sm ${
              job.status === "APPROVED" ? "text-emerald-600" : "text-amber-600"
            }`}>
               {job.status === "SUBMITTED" ? "กำลังรอการตรวจสอบ (Reviewing)" : job.status}
            </div>
          </div>
        </div>

        {/* Dynamic Matrix Component */}
        <PMReviewTable jobId={jobId} />

      </div>
    </main>
  );
}
