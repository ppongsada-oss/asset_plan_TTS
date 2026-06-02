"use client";

import { UserCheck, FileSearch, Loader2, ChevronRight, AlertCircle, LayoutGrid, History, CheckCircle2, XCircle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import useSWR from "swr";

const fetcher = (url: string): Promise<any> => fetch(url).then(res => res.json());

type PendingJob = {
  id: number;
  project_id: string;
  job_number: string;
  status: string;
  cycle_number: string;
  end_date: string;
};

export default function PMApprovalDashboard() {
  const [jobs, setJobs] = useState<PendingJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewTab, setViewTab] = useState<"PENDING" | "HISTORY">("PENDING");

  const { data: jobsResponse } = useSWR<{ success: boolean; data: PendingJob[] }>("/api/site/jobs", fetcher);

  useEffect(() => {
    if (jobsResponse?.success) {
      setJobs(jobsResponse.data);
    }
  }, [jobsResponse]);

  useEffect(() => {
    if (jobsResponse) {
      setLoading(false);
    } else {
      setLoading(true);
    }
  }, [jobsResponse]);

  const filteredJobs = useMemo(() => {
    if (viewTab === "PENDING") {
      return jobs.filter(j => j.status === "SUBMITTED");
    } else {
      return jobs.filter(j => j.status === "APPROVED" || j.status === "REJECTED" || j.status === "CLOSED");
    }
  }, [jobs, viewTab]);

  const pendingCount = jobs.filter(j => j.status === "SUBMITTED").length;
  const historyCount = jobs.filter(j => j.status === "APPROVED" || j.status === "REJECTED" || j.status === "CLOSED").length;

  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Page Context Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <UserCheck size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">PM Approval Hub</h1>
              <p className="text-sm text-slate-500">
                รายการแผนงานที่รอการตรวจสอบและอนุมัติจากคุณ
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 min-w-[160px]">
              <p className="text-xs text-slate-500 font-medium uppercase mb-1">งานค้างอนุมัติ</p>
              <div className="flex items-center gap-2 text-rose-600 font-bold text-lg">
                {pendingCount} รายการ
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 min-w-[160px]">
              <p className="text-xs text-slate-500 font-medium uppercase mb-1">ดำเนินการแล้ว</p>
              <div className="flex items-center gap-2 text-indigo-600 font-bold text-lg">
                {historyCount} รายการ
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex border-b border-slate-200">
          <button 
            onClick={() => setViewTab("PENDING")}
            className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${viewTab === "PENDING" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            รออนุมัติ ({pendingCount})
          </button>
          <button 
            onClick={() => setViewTab("HISTORY")}
            className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${viewTab === "HISTORY" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            ประวัติการอนุมัติ
          </button>
        </div>

        <div className="mt-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            {viewTab === "PENDING" ? <FileSearch className="text-indigo-600" /> : <History className="text-indigo-600" />}
            {viewTab === "PENDING" ? "แผนงานที่ส่งมา (Pending Review)" : "ประวัติการดำเนินการ (Approval History)"}
          </h2>

          {loading ? (
            <div className="flex justify-center p-12 bg-white rounded-2xl border border-slate-200">
              <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-2xl border border-slate-200 border-dashed">
              <LayoutGrid className="mx-auto text-slate-300 mb-3" size={48} />
              <p className="text-slate-500 font-medium">ไม่พบรายการแผนงานในหน้านี้</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredJobs.map((job) => (
                <Link href={`/site-plan/pm-approval/${job.id}`} key={job.id} className="block group">
                  <div className={`bg-white rounded-2xl border p-6 transition-all shadow-sm group-hover:shadow-md ${
                    job.status === "APPROVED" ? "border-emerald-100 group-hover:border-emerald-300" :
                    job.status === "REJECTED" ? "border-rose-100 group-hover:border-rose-300" :
                    "border-indigo-100 group-hover:border-indigo-300"
                  }`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          job.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" :
                          job.status === "REJECTED" ? "bg-rose-50 text-rose-700" :
                          "bg-amber-50 text-amber-700"
                        }`}>
                          {job.status === "APPROVED" ? <CheckCircle2 size={12} className="mr-1" /> : 
                           job.status === "REJECTED" ? <XCircle size={12} className="mr-1" /> : null}
                          {job.status}
                        </span>
                        <p className="text-[10px] font-bold text-indigo-500 mt-1 uppercase tracking-widest">{job.project_id}</p>
                      </div>
                      <span className="text-xs text-slate-400 font-bold">{job.job_number}</span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">
                      งวดงาน {job.cycle_number}
                    </h3>
                    
                    <p className="text-xs text-slate-500 mb-4">โปรดตรวจสอบและยืนยันแผนงานก่อนวันสิ้นสุดงวด</p>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-medium text-indigo-600">
                      <span>ตรวจสอบใบงาน</span>
                      <ChevronRight size={18} className="text-indigo-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
