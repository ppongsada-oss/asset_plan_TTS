import PlanningWorksheet from "@/components/site-plan/PlanningWorksheet";
import { HardHat, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { getDb } from "@/db";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { planning_jobs, planning_cycles, projects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";


export default async function JobPlanPage({
  params,
}: {
  params: Promise<{ job_id: string }>
}) {
  const { job_id } = await params;
  
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
  .where(eq(planning_jobs.id, parseInt(job_id)))
  .limit(1);
  
  const jobData = jobRows[0];
  if (!jobData) {
    redirect("/site-plan");
  }

  const { job, cycle, project } = jobData;
  const targetMonths = JSON.parse(cycle.target_months);
  const isOverdue = new Date(cycle.end_date) < new Date();
  const isUnlocked = job.is_unlocked === 1;
  const isClosed = job.status === "CLOSED" || (isOverdue && !isUnlocked);

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-6">
          <Link href="/site-plan" className="text-slate-500 hover:text-indigo-600 flex items-center gap-1 text-sm font-medium w-fit">
            <ChevronLeft size={16} /> กลับไปยังหน้า Dashboard
          </Link>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <HardHat size={24} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight flex flex-col md:flex-row md:items-center gap-2">
                <span className="text-slate-900">แบบประเมินโครงการ</span>
                <span className="text-emerald-600 bg-emerald-50 px-4 py-1 rounded-2xl border border-emerald-100 shadow-sm inline-block">
                  {project.name} <span className="text-emerald-400 font-medium text-lg">({job.project_id})</span>
                </span>
              </h1>
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                  job.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
                  job.status === "SUBMITTED" ? "bg-amber-100 text-amber-700" :
                  job.status === "REJECTED" ? "bg-rose-100 text-rose-700" :
                  isClosed ? "bg-slate-200 text-slate-600" : "bg-indigo-100 text-indigo-700"
              }`}>
                {job.status}
              </span>
            </div>
            <div className="text-slate-500 flex flex-wrap items-center gap-y-1 gap-x-4 text-sm mt-3 border-t border-slate-100 pt-3">
              <span>งวดงาน: <strong className="text-slate-700">{cycle.cycle_number}</strong></span>
              <span className="text-slate-300">|</span>
              <span>รหัสอ้างอิง: <strong className="text-slate-700">{job.job_number}</strong></span>
              <span className="text-slate-300">|</span>
              <span>ปิดรับ: <strong className={isClosed ? "text-rose-500" : "text-slate-700"}>{cycle.end_date}</strong></span>
            </div>
          </div>
        </div>

        <PlanningWorksheet 
          jobId={job.id} 
          projectId={job.project_id} 
          targetMonths={targetMonths} 
          isClosed={isClosed}
          jobStatus={job.status}
          isUnlocked={isUnlocked}
        />
      </div>
    </main>
  );
}
