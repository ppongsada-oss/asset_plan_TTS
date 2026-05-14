"use client";

import { useState } from "react";
import CenterDashboard from "@/components/store-center/CenterDashboard";
import JobManagement from "@/components/store-center/JobManagement";

export default function StoreCenterTabs() {
  const [activeTab, setActiveTab] = useState<"DEMAND" | "JOBS">("JOBS");

  return (
    <div>
      {/* Tabs */}
      <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl w-fit mb-6">
        <button
          onClick={() => setActiveTab("JOBS")}
          className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            activeTab === "JOBS" 
              ? "bg-white text-indigo-700 shadow-sm" 
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
          }`}
        >
          จัดการใบงาน (Planning Jobs)
        </button>
        <button
          onClick={() => setActiveTab("DEMAND")}
          className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            activeTab === "DEMAND" 
              ? "bg-white text-indigo-700 shadow-sm" 
              : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
          }`}
        >
          ความต้องการสุทธิ (Net Demand & Decisions)
        </button>
      </div>

      {activeTab === "JOBS" && <JobManagement />}
      {activeTab === "DEMAND" && <CenterDashboard />}
    </div>
  );
}
