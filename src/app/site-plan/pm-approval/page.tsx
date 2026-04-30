import PMReviewTable from "@/components/site-plan/PMReviewTable";
import { UserCheck } from "lucide-react";

export default function PMApprovalPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Page Context Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <UserCheck size={24} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Project 1: Rama 9 Condo</h1>
            </div>
            <p className="text-slate-500 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-slate-300"></span>
              Role: <strong>Project Manager (PM)</strong> (ผู้อนุมัติฝั่งไซต์งาน)
            </p>
          </div>
          
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 min-w-[200px]">
            <p className="text-xs text-slate-500 font-medium uppercase mb-1">สถานะปัจจุบัน</p>
            <div className="flex items-center gap-2 text-indigo-600 font-semibold">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
              </span>
              รอ PM อนุมัติ (Pending Approval)
            </div>
          </div>
        </div>

        {/* Dynamic Matrix Component */}
        <PMReviewTable />

      </div>
    </main>
  );
}
