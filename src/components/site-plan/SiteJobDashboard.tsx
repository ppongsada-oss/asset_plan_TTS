"use client";

import { useState, useEffect } from "react";
import { FileText, Calendar, Clock, ChevronRight, Loader2, Filter, LayoutGrid, Lock, AlertTriangle, Timer } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SiteJob = {
  id: number;
  project_id: string;
  job_number: string;
  status: string;
  is_unlocked: number;
  cycle_number: string;
  start_date: string;
  end_date: string;
  target_months: string;
  project_name?: string;
};

type Props = {
  initialProjectId: string;
  accessibleProjects: string[];
};

export default function SiteJobDashboard({ initialProjectId, accessibleProjects }: Props) {
  const [jobs, setJobs] = useState<SiteJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const router = useRouter();

  const fetchJobs = async (pid: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/site/jobs?project_id=${pid}`);
      
      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error("API non-JSON response:", text.substring(0, 500));
        throw new Error("ระบบตอบกลับผิดพลาด (Non-JSON)");
      }

      if (data.success) {
        setJobs(data.data);
      } else {
        console.error("Fetch Jobs Error:", data.error);
        setJobs([]);
      }
    } catch (e) {
      console.error("Fetch Jobs Failed:", e);
      setJobs([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchJobs(selectedProjectId);
  }, [selectedProjectId]);

  const handleProjectChange = (pid: string) => {
    setSelectedProjectId(pid);
    // Update URL without full refresh to maintain state if needed, 
    // though here we handle state locally.
    router.replace(`/site-plan?project_id=${pid}`, { scroll: false });
  };

  return (
    <div className="mt-8">
      {/* Project Selector */}
      <div className="mb-8 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-indigo-600" />
            ใบงานที่รอการประเมินแผน (Pending Jobs)
          </h2>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Filter size={16} />
            <span>กรองตามโครงการ:</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleProjectChange("ALL")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
              selectedProjectId === "ALL" 
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md" 
                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
            }`}
          >
            <div className="flex items-center gap-2">
              <LayoutGrid size={16} />
              โครงการทั้งหมด
            </div>
          </button>
          
          {accessibleProjects.map(pid => (
            <button
              key={pid}
              onClick={() => handleProjectChange(pid)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                selectedProjectId === pid 
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md" 
                  : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30"
              }`}
            >
              {pid}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-2xl border border-slate-200 border-dashed">
          <FileText className="mx-auto text-slate-300 mb-3" size={48} />
          <p className="text-slate-500 font-medium">ไม่พบใบงานสำหรับ {selectedProjectId === "ALL" ? "โครงการที่คุณรับผิดชอบ" : `โครงการ ${selectedProjectId}`}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => {
            const now = new Date();
            const endDate = new Date(job.end_date);
            const msPerDay = 1000 * 60 * 60 * 24;
            const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / msPerDay);
            const isOverdue = daysLeft < 0;
            const isUnlocked = job.is_unlocked === 1;
            const isClosed = job.status === "CLOSED" || (isOverdue && !isUnlocked);
            const isLocked = (job.status === "APPROVED" && !isUnlocked) || isClosed;

            return (
              <Link href={`/site-plan/${job.id}`} key={job.id} className="block group">
                <div className={`relative bg-white rounded-2xl border p-6 transition-all shadow-sm group-hover:shadow-md ${
                  isOverdue ? "border-rose-200 bg-rose-50/30" :
                  isLocked ? "border-slate-200 opacity-80" :
                  daysLeft <= 3 ? "border-amber-200 group-hover:border-amber-300" :
                  "border-indigo-100 group-hover:border-indigo-300"
                }`}>

                  {/* Lock / Unlock overlay icon */}
                  {isLocked && (
                    <div className="absolute top-4 right-4 text-slate-400">
                      <Lock size={14} className="opacity-60" />
                    </div>
                  )}
                  {isUnlocked && (isOverdue || job.status === "APPROVED") && (
                    <div className="absolute top-4 right-4">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                        🔓 ปลดล็อคชั่วคราว
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-1.5">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        job.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" :
                        job.status === "SUBMITTED" ? "bg-amber-50 text-amber-700" :
                        isOverdue ? "bg-rose-100 text-rose-700" :
                        isClosed ? "bg-slate-100 text-slate-600" : "bg-indigo-50 text-indigo-700"
                      }`}>
                        {job.status}
                      </span>

                      {/* Countdown badge */}
                      {isOverdue ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                          <AlertTriangle size={10} />
                          เกินกำหนด {Math.abs(daysLeft)} วัน
                        </span>
                      ) : daysLeft === 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 animate-pulse">
                          <Timer size={10} />
                          ปิดรับวันนี้!
                        </span>
                      ) : daysLeft <= 3 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600">
                          <Timer size={10} />
                          เหลือ {daysLeft} วัน
                        </span>
                      ) : !isLocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-500">
                          <Clock size={10} />
                          เหลือ {daysLeft} วัน
                        </span>
                      ) : null}
                    </div>
                    <span className="text-xs text-slate-400 font-bold">{job.job_number}</span>
                  </div>

                  <h3 className={`text-xl font-black leading-tight mb-1 transition-colors ${
                    isOverdue ? "text-rose-700" :
                    isLocked ? "text-slate-600" :
                    "text-indigo-700 group-hover:text-indigo-600"
                  }`}>
                    {job.project_name || job.project_id}
                  </h3>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      ID: {job.project_id}
                    </span>
                    <span className="text-sm font-bold text-slate-600">
                      งวดงาน: {job.cycle_number}
                    </span>
                  </div>

                  <div className="space-y-2 mt-4 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-slate-400" />
                      <span>
                        เดือนที่ประเมิน: {(() => {
                          try {
                            return JSON.parse(job.target_months).length;
                          } catch {
                            return 0;
                          }
                        })()} เดือน
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className={isOverdue ? "text-rose-400" : isClosed ? "text-slate-400" : daysLeft <= 3 ? "text-amber-400" : "text-slate-400"} />
                      <span>Deadline: <span className={`font-medium ${
                        isOverdue ? "text-rose-600" : daysLeft <= 3 && !isLocked ? "text-amber-600" : ""
                      }`}>{job.end_date}</span></span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-medium">
                    <span className={isOverdue ? "text-rose-500" : isLocked ? "text-slate-500" : "text-indigo-600"}>
                      {isLocked ? "ดูรายละเอียด" : "เริ่มวางแผน"}
                    </span>
                    <ChevronRight size={18} className={isLocked ? "text-slate-400" : "text-indigo-400"} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
