"use client";

import { useState } from "react";
import { useToast } from '@/hooks/useToast';
import { Plus, Calendar, Loader2, CheckCircle2, Edit2, ShieldAlert, Search, X, Trash2, Clock, AlertTriangle, Timer, Lock, LockOpen } from "lucide-react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import useSWR from "swr";

type Project = {
  id: string;
  name: string;
  type: string;
  status: string;
};

type Job = {
  id: number;
  project_id: string;
  job_number: string;
  status: string;
  is_unlocked: number;
  edit_requested: number;
};

type Cycle = {
  id: number;
  cycle_number: string;
  start_date: string;
  end_date: string;
  target_months: string;
  jobs: Job[];
};

type ApiListResponse<T> = {
  success: boolean;
  data: T[];
};

const getDynamicMonths = (year: number) => {
  return Array.from({ length: 12 }, (_, i) => {
    const monthNum = String(i + 1).padStart(2, "0");
    return `${year}-${monthNum}`;
  });
};

export default function JobManagement() {
  const { toast } = useToast();
  const fetcher = async <T,>(url: string): Promise<T> => fetch(url).then((res) => res.json() as Promise<T>);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [revertModalOpen, setRevertModalOpen] = useState(false);
  const [revertJobId, setRevertJobId] = useState<number | null>(null);
  const [reverting, setReverting] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [projectFilter, setProjectFilter] = useState<string>("SITE");
  const [projectSearch, setProjectSearch] = useState<string>("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: cyclesResponse, isLoading: cyclesLoading, mutate: mutateCycles } = useSWR<ApiListResponse<Cycle>>("/api/center/cycles", (url: string) => fetcher<ApiListResponse<Cycle>>(url), {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });
  const { data: projectsResponse, isLoading: projectsLoading, mutate: mutateProjects } = useSWR<ApiListResponse<Project>>("/api/projects", (url: string) => fetcher<ApiListResponse<Project>>(url), {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  const cycles = cyclesResponse?.success ? (cyclesResponse.data as Cycle[]) : [];
  const projects = projectsResponse?.success ? (projectsResponse.data as Project[]) : [];
  const loading = cyclesLoading || projectsLoading || refreshing;

  const fetchData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([mutateCycles(), mutateProjects()]);
    } finally {
      setRefreshing(false);
    }
  };

  const patchCycleJobCache = (jobId: number, updater: (job: Job) => Job) => {
    void mutateCycles((current: any) => {
      if (!current?.success || !Array.isArray(current.data)) return current;
      return {
        ...current,
        data: current.data.map((cycle: Cycle) => ({
          ...cycle,
          jobs: cycle.jobs.map((job) => (job.id === jobId ? updater(job) : job)),
        })),
      };
    }, { revalidate: false });
  };

  const openCreateModal = () => {
    setEditingCycle(null);
    setSelectedProjectIds([]);
    setStartDate("");
    setEndDate("");
    setSelectedMonths([]);
    setProjectFilter("SITE");
    setProjectSearch("");
    setIsModalOpen(true);
  };

  const openEditModal = (cycle: Cycle) => {
    setEditingCycle(cycle);
    setSelectedProjectIds(cycle.jobs.map(j => j.project_id));
    setStartDate(cycle.start_date);
    setEndDate(cycle.end_date);
    setSelectedMonths(JSON.parse(cycle.target_months));
    setIsModalOpen(true);
  };

  const toggleMonth = (m: string) => {
    setSelectedMonths(prev => 
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );
  };

  const toggleProject = (pid: string) => {
    setSelectedProjectIds(prev => 
      prev.includes(pid) ? prev.filter(x => x !== pid) : [...prev, pid]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMonths.length === 0) { toast.info("กรุณาเลือกเดือนอย่างน้อย 1 เดือน"); return; }
    if (selectedProjectIds.length === 0) { toast.info("กรุณาเลือกโครงการอย่างน้อย 1 โครงการ"); return; }

    setSubmitting(true);
    try {
      const url = editingCycle ? `/api/center/cycles/${editingCycle.id}` : "/api/center/cycles";
      const method = editingCycle ? "PUT" : "POST";
      
      const payload = editingCycle ? { project_ids: selectedProjectIds } : {
        project_ids: selectedProjectIds,
        start_date: startDate,
        end_date: endDate,
        target_months: selectedMonths
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json() as any;
      
      if (json.success) {
        setIsModalOpen(false);
        await fetchData();
      } else {
        toast.error("Error: " + json.error);
      }
    } catch (e) {
      toast.error("Error submitting request");
    }
    setSubmitting(false);
  };

  const handleBulkCancel = async () => {
    if (selectedProjectIds.length === 0) return;
    
    // Find which selected IDs are actually in the current cycle
    const jobsToCancel = editingCycle?.jobs.filter(j => 
      selectedProjectIds.includes(j.project_id) && j.status !== "APPROVED"
    ) || [];

    if (jobsToCancel.length === 0) {
      toast.info("ไม่มีโครงการที่สามารถยกเลิกได้ (หรือโครงการที่เลือกถูก APPROVED แล้ว)"); return;
    }

    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการยกเลิก ${jobsToCancel.length} โครงการที่เลือก? ข้อมูลแผนงานจะถูกลบออกทั้งหมด`)) return;

    setSubmitting(true);
    try {
      for (const job of jobsToCancel) {
        await fetch(`/api/center/jobs/${job.id}`, { method: "DELETE" });
      }
      setIsModalOpen(false);
      await fetchData();
    } catch (e) {
      toast.error("Error cancelling jobs");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCycle = async (cycleId: number, hasApproved: boolean) => {
    if (hasApproved) {
      toast.info("ไม่สามารถลบงวดงานนี้ได้ เนื่องจากมีบางโครงการได้รับการอนุมัติ (APPROVED) แล้ว"); return;
    }

    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบงวดงานนี้? ข้อมูลโครงการและแผนงานทั้งหมดในงวดนี้จะถูกลบออกถาวร")) return;

    try {
      const res = await fetch(`/api/center/cycles/${cycleId}`, {
        method: "DELETE",
      });
      const json = await res.json() as any;
      if (json.success) {
        await fetchData();
      } else {
        toast.error("Error: " + json.error);
      }
    } catch (e) {
      toast.error("Error deleting cycle");
    }
  };

  const handleToggleUnlock = async (jobId: number, currentUnlocked: number) => {
    const newState = currentUnlocked === 1 ? 0 : 1;
    const label = newState === 1 ? "ปลดล็อค" : "ล็อคคืน";
    if (!confirm(`คุณต้องการ${label}การ์ดงานนี้ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/center/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_unlocked: newState }),
      });
      const json = await res.json() as any;
      if (json.success) {
        patchCycleJobCache(jobId, (job) => ({ ...job, is_unlocked: newState }));
      } else {
        toast.error("Error: " + json.error);
      }
    } catch (e) {
      toast.error("เกิดข้อผิดพลาด");
    }
  };

  const handleRevertApproval = async () => {
    if (!revertJobId) return;
    setReverting(true);
    try {
      const res = await fetch("/api/center/jobs/revert-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: revertJobId }),
      });
      const json = await res.json() as any;
      if (json.success) {
        toast.success("อนุมัติคำขอแก้ไขสำเร็จ แผนงานกลับเป็น SUBMITTED แล้ว");
        patchCycleJobCache(revertJobId, (job) => ({ ...job, status: "SUBMITTED", edit_requested: 0 }));
      } else {
        toast.error("Error: " + json.error);
      }
    } catch (e) {
      toast.error("เกิดข้อผิดพลาด");
    } finally {
      setReverting(false);
      setRevertModalOpen(false);
      setRevertJobId(null);
    }
  };

  const filteredProjects = projects.filter(p => {
    // Hide archived projects UNLESS they are already part of the editing cycle
    const isAlreadyInCycle = editingCycle?.jobs.find(j => j.project_id === p.id);
    if (p.status === "ARCHIVED" && !isAlreadyInCycle) return false;

    if (projectFilter !== "ALL" && p.type !== projectFilter) return false;
    if (projectSearch && !p.id.toLowerCase().includes(projectSearch.toLowerCase()) && !p.name.toLowerCase().includes(projectSearch.toLowerCase())) return false;
    return true;
  });

  const handleSelectAllFiltered = () => {
    const newIds = filteredProjects
      .filter(p => {
        const isApproved = editingCycle?.jobs.find(j => j.project_id === p.id)?.status === "APPROVED";
        return !isApproved;
      })
      .map(p => p.id);
    const notInFiltered = selectedProjectIds.filter(id => !filteredProjects.find(p => p.id === id));
    setSelectedProjectIds(Array.from(new Set([...newIds, ...notInFiltered])));
  };

  const handleDeselectAllFiltered = () => {
    const filteredIds = filteredProjects.map(p => p.id);
    const newSelected = selectedProjectIds.filter(id => {
      if (!filteredIds.includes(id)) return true;
      const isApproved = editingCycle?.jobs.find(j => j.project_id === id)?.status === "APPROVED";
      return isApproved;
    });
    setSelectedProjectIds(newSelected);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6 relative">
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Calendar size={20} className="text-indigo-600" />
            ระบบกำหนดงวดงาน (Planning Cycles)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            สร้างงวดงานเพื่อแจ้งให้หลายโครงการวางแผนล่วงหน้าพร้อมกัน
          </p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm font-medium text-sm"
        >
          <Plus size={16} />
          สร้างงวดงานใหม่
        </button>
      </div>

      <div className="p-6 space-y-6">
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
        ) : cycles.length === 0 ? (
          <div className="py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">ยังไม่มีประวัติการสร้างงวดงาน</div>
        ) : cycles.map((cycle) => {
          const now = new Date();
          const endDate = new Date(cycle.end_date);
          const msPerDay = 1000 * 60 * 60 * 24;
          const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / msPerDay);
          const isOverdue = daysLeft < 0;
          const hasApproved = cycle.jobs.some(j => j.status === "APPROVED");

          return (
            <div key={cycle.id} className={`rounded-2xl border shadow-sm overflow-hidden border-l-4 ${
              isOverdue ? "border-rose-200 border-l-rose-500 bg-rose-50/30" :
              daysLeft <= 3 ? "border-amber-200 border-l-amber-500 bg-amber-50/10" :
              "border-slate-200 border-l-indigo-500 bg-white"
            }`}>
              {/* Cycle Header */}
              <div className="border-b border-slate-200/80 p-5 flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-bold text-lg ${
                      isOverdue ? "text-rose-700" : "text-slate-800"
                    }`}>
                      {cycle.cycle_number}
                    </h3>
                    <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100">
                      {JSON.parse(cycle.target_months).length} เดือน
                    </span>
                    {hasApproved && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                        <Lock size={9} /> มี APPROVED
                      </span>
                    )}
                    {/* Countdown badge */}
                    {isOverdue ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                        <AlertTriangle size={10} />
                        เกินกำหนด {Math.abs(daysLeft)} วัน
                      </span>
                    ) : daysLeft === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 animate-pulse">
                        <Timer size={10} /> ปิดรับวันนี้!
                      </span>
                    ) : daysLeft <= 3 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600">
                        <Timer size={10} /> เหลือ {daysLeft} วัน
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-400">
                        <Clock size={10} /> เหลือ {daysLeft} วัน
                      </span>
                    )}
                  </div>
                  <p className={`text-sm mt-1.5 flex items-center gap-1.5 ${
                    isOverdue ? "text-rose-500" : "text-slate-500"
                  }`}>
                    <Clock size={13} />
                    เริ่ม: {cycle.start_date} &nbsp;·&nbsp; สิ้นสุด:
                    <span className={`font-semibold ${
                      isOverdue ? "text-rose-600" : daysLeft <= 3 ? "text-amber-600" : "text-slate-700"
                    }`}>{cycle.end_date}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => openEditModal(cycle)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors border border-indigo-100"
                    title="แก้ไขโครงการในงวด"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteCycle(cycle.id, cycle.jobs.some(j => j.status === "APPROVED"))}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors border border-rose-100"
                    title="ลบงวดงานนี้"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Job cards inside cycle — SiteJobDashboard style */}
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cycle.jobs.length === 0 && <div className="text-sm text-slate-400 col-span-3 py-6 text-center border-2 border-dashed border-slate-200 rounded-xl">ไม่มีโครงการในงวดนี้</div>}
                {cycle.jobs.map(job => {
                  const project = projects.find(p => p.id === job.project_id);
                  const isApproved = job.status === "APPROVED";
                  const isSubmitted = job.status === "SUBMITTED";
                  const isLocked = isApproved || isOverdue;

                  let targetMonthsCount = 0;
                  try { targetMonthsCount = JSON.parse(cycle.target_months).length; } catch { targetMonthsCount = 0; }

                  return (
                    <div key={job.id} className={`relative bg-white rounded-2xl border p-5 transition-all shadow-sm hover:shadow-md ${
                      isOverdue ? "border-rose-200 bg-rose-50/20" :
                      isApproved ? "border-emerald-200 opacity-90" :
                      isSubmitted ? "border-amber-200" :
                      daysLeft <= 3 ? "border-amber-200 hover:border-amber-300" :
                      "border-indigo-100 hover:border-indigo-300"
                    }`}>

                      {/* Lock overlay */}
                      {isLocked && (
                        <div className="absolute top-4 right-4 text-slate-400">
                          <Lock size={14} className="opacity-60" />
                        </div>
                      )}

                      {/* Status + countdown badges */}
                      <div className="flex flex-col gap-1.5 mb-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider w-fit ${
                          isApproved ? "bg-emerald-50 text-emerald-700" :
                          isSubmitted ? "bg-amber-50 text-amber-700" :
                          isOverdue ? "bg-rose-100 text-rose-700" :
                          "bg-indigo-50 text-indigo-700"
                        }`}>
                          {job.status}
                        </span>
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 w-fit">
                            <AlertTriangle size={10} /> เกินกำหนด {Math.abs(daysLeft)} วัน
                          </span>
                        ) : daysLeft === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 animate-pulse w-fit">
                            <Timer size={10} /> ปิดรับวันนี้!
                          </span>
                        ) : daysLeft <= 3 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 w-fit">
                            <Timer size={10} /> เหลือ {daysLeft} วัน
                          </span>
                        ) : !isLocked ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-500 w-fit">
                            <Clock size={10} /> เหลือ {daysLeft} วัน
                          </span>
                        ) : null}
                      </div>

                      {/* Project name */}
                      <h4 className={`text-base font-black leading-tight mb-1 ${
                        isOverdue ? "text-rose-700" :
                        isLocked ? "text-slate-600" :
                        "text-indigo-700"
                      }`}>
                        {project?.name || job.project_id}
                      </h4>

                      {/* ID + job number */}
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          ID: {job.project_id}
                        </span>
                        <span className="text-xs font-bold text-slate-500">{job.job_number}</span>
                      </div>

                      {/* Info rows */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400 shrink-0" />
                          <span className="text-xs text-slate-600">เดือนที่ประเมิน: <span className="font-semibold">{targetMonthsCount} เดือน</span></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={14} className={`shrink-0 ${isOverdue ? "text-rose-400" : daysLeft <= 3 ? "text-amber-400" : "text-slate-400"}`} />
                          <span className="text-xs text-slate-600">Deadline: <span className={`font-semibold ${isOverdue ? "text-rose-600" : daysLeft <= 3 && !isLocked ? "text-amber-600" : ""}`}>{cycle.end_date}</span></span>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                        <span className={`text-xs font-semibold ${
                          job.is_unlocked === 1 ? "text-emerald-600" :
                          isOverdue ? "text-rose-500" : isLocked ? "text-slate-400" : "text-indigo-600"
                        }`}>
                          {job.is_unlocked === 1 ? "🔓 ปลดล็อคชั่วคราว" : isApproved ? "อนุมัติแล้ว" : isSubmitted ? "รออนุมัติ" : isOverdue ? "เลยกำหนด" : "เปิดงาน"}
                        </span>
                        <div className="flex items-center gap-2">
                          {isApproved && !!job.edit_requested && (
                            <button
                              onClick={() => { setRevertJobId(job.id); setRevertModalOpen(true); }}
                              title="อนุมัติคำขอแก้ไขของ PM"
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                            >
                              Reject (แก้ไข)
                            </button>
                          )}
                          {(isOverdue || isApproved) && (
                            <button
                              onClick={() => handleToggleUnlock(job.id, job.is_unlocked)}
                              title={job.is_unlocked === 1 ? "ล็อคคืน" : "ปลดล็อค"}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                                job.is_unlocked === 1
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                  : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                              }`}
                            >
                              {job.is_unlocked === 1 ? <><Lock size={10} /> ล็อคคืน</> : <><LockOpen size={10} /> ปลดล็อค</>}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{editingCycle ? `แก้ไขโครงการในงวด ${editingCycle.cycle_number}` : "สร้างงวดงานใหม่"}</h3>
                <p className="text-xs text-slate-500 mt-1">{editingCycle ? "วันที่และเดือนไม่สามารถแก้ได้ในหน้าต่างนี้" : "กำหนดเป้าหมายและเลือกโครงการ"}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
              
              {!editingCycle && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">เริ่มเปิดให้กรอก (Start Date)</label>
                      <input 
                        type="date" 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-slate-800"
                        value={startDate} onChange={e => setStartDate(e.target.value)} required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">วันสิ้นสุด / ปิดรับ (End Date)</label>
                      <input 
                        type="date" 
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-slate-800"
                        value={endDate} onChange={e => setEndDate(e.target.value)} required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
                      <label className="block text-sm font-medium text-slate-700">เลือกเดือนเป้าหมาย (Target Months)</label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">ปีเป้าหมาย (Target Year):</span>
                        <select 
                          value={selectedYear}
                          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                          className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white font-medium text-slate-700 outline-none focus:border-indigo-500"
                        >
                          {[2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033, 2034, 2035].map(y => (
                            <option key={y} value={y}>{y + 543} ({y})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {getDynamicMonths(selectedYear).map(m => (
                        <button
                          type="button"
                          key={m}
                          onClick={() => toggleMonth(m)}
                          className={`px-3 py-2 rounded-lg border text-sm font-medium flex items-center justify-between transition-colors ${
                            selectedMonths.includes(m) 
                              ? "bg-indigo-50 border-indigo-600 text-indigo-700" 
                              : "bg-white border-slate-200 text-slate-600 hover:border-indigo-300"
                          }`}
                        >
                          {m}
                          {selectedMonths.includes(m) && <CheckCircle2 size={14} />}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <div>
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-3">
                  <label className="block text-sm font-medium text-slate-700">
                    เลือกโครงการ (Projects)
                    {editingCycle && <span className="text-xs text-amber-600 flex items-center gap-1 mt-1"><ShieldAlert size={14}/> โครงการที่ APPROVED จะลบไม่ได้</span>}
                  </label>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      <input 
                        type="text" 
                        placeholder="ค้นหา..." 
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        className="pl-8 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full sm:w-40"
                      />
                    </div>
                    <select 
                      value={projectFilter} 
                      onChange={(e) => setProjectFilter(e.target.value)}
                      className="py-1.5 pl-3 pr-8 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="ALL">ทั้งหมด</option>
                      <option value="SITE">เฉพาะ Site</option>
                      <option value="WAREHOUSE">เฉพาะ Warehouse</option>
                    </select>
                    <button type="button" onClick={handleSelectAllFiltered} className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 font-medium border border-indigo-200">
                      เลือกทั้งหมด
                    </button>
                    <button type="button" onClick={handleDeselectAllFiltered} className="text-xs bg-slate-50 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 font-medium border border-slate-200">
                      ล้าง
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto p-1">
                  {filteredProjects.length === 0 && <div className="col-span-2 text-center py-8 text-slate-400 text-sm">ไม่พบโครงการที่ค้นหา</div>}
                  {filteredProjects.map(proj => {
                    const isChecked = selectedProjectIds.includes(proj.id);
                    // Check if it's editing and if the project is approved
                    const isApproved = editingCycle?.jobs.find(j => j.project_id === proj.id)?.status === "APPROVED";
                    
                    return (
                      <div
                        key={proj.id}
                        onClick={() => { if (!isApproved) toggleProject(proj.id); }}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                          isChecked ? "bg-indigo-50 border-indigo-500" : "bg-white border-slate-200 hover:border-indigo-300"
                        } ${isApproved ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                          isChecked ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white"
                        }`}>
                          {isChecked && <CheckCircle2 size={14} className="text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-bold truncate ${isChecked ? "text-indigo-900" : "text-slate-700"}`}>{proj.id}</p>
                            {proj.status === "ARCHIVED" && (
                              <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded border border-slate-200">ARCHIVED</span>
                            )}
                          </div>
                          <p className={`text-xs truncate ${isChecked ? "text-indigo-600" : "text-slate-500"}`}>{proj.name}</p>
                        </div>
                        {isApproved && <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">LOCKED</span>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 border-t border-slate-100">
                <div>
                  {editingCycle && selectedProjectIds.length > 0 && (
                    <button 
                      type="button" 
                      onClick={handleBulkCancel}
                      disabled={submitting}
                      className="px-4 py-2 text-rose-600 font-medium hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-2 text-sm border border-rose-100"
                    >
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
                      ยกเลิกโครงการที่เลือกออกจากงวด
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg">ยกเลิก</button>
                  <button type="submit" disabled={submitting} className="px-6 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg disabled:opacity-50 shadow-sm">
                    {submitting ? "กำลังบันทึก..." : "ยืนยันการตั้งค่า"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={revertModalOpen}
        onClose={() => { setRevertModalOpen(false); setRevertJobId(null); }}
        onConfirm={handleRevertApproval}
        title="อนุมัติคำขอแก้ไขของ PM"
        message="แผนงานจะถูกเปลี่ยนสถานะกลับเป็น SUBMITTED เพื่อให้ PM แก้ไขได้ คุณต้องการดำเนินการต่อหรือไม่?"
        confirmText="ยืนยัน"
        cancelText="ยกเลิก"
        type="warning"
        isLoading={reverting}
      />
    </div>
  );
}
