"use client";

import { useState, useEffect } from "react";
import { Plus, Calendar, Loader2, CheckCircle2, Edit2, ShieldAlert, Search, X, Trash2 } from "lucide-react";

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
};

type Cycle = {
  id: number;
  cycle_number: string;
  start_date: string;
  end_date: string;
  target_months: string;
  jobs: Job[];
};

const AVAILABLE_MONTHS = [
  "2026-01", "2026-02", "2026-03", "2026-04", 
  "2026-05", "2026-06", "2026-07", "2026-08",
  "2026-09", "2026-10", "2026-11", "2026-12"
];

export default function JobManagement() {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<Cycle | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>("SITE");
  const [projectSearch, setProjectSearch] = useState<string>("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cycleRes, projRes] = await Promise.all([
        fetch("/api/center/cycles"),
        fetch("/api/projects")
      ]);
      const cycleJson = await cycleRes.json();
      const projJson = await projRes.json();
      if (cycleJson.success) setCycles(cycleJson.data);
      if (projJson.success) setProjects(projJson.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

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
    if (selectedMonths.length === 0) return alert("กรุณาเลือกเดือนอย่างน้อย 1 เดือน");
    if (selectedProjectIds.length === 0) return alert("กรุณาเลือกโครงการอย่างน้อย 1 โครงการ");

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
      const json = await res.json();
      
      if (json.success) {
        setIsModalOpen(false);
        fetchData();
      } else {
        alert("Error: " + json.error);
      }
    } catch (e) {
      alert("Error submitting request");
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
      return alert("ไม่มีโครงการที่สามารถยกเลิกได้ (หรือโครงการที่เลือกถูก APPROVED แล้ว)");
    }

    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการยกเลิก ${jobsToCancel.length} โครงการที่เลือก? ข้อมูลแผนงานจะถูกลบออกทั้งหมด`)) return;

    setSubmitting(true);
    try {
      for (const job of jobsToCancel) {
        await fetch(`/api/center/jobs/${job.id}`, { method: "DELETE" });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (e) {
      alert("Error cancelling jobs");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCycle = async (cycleId: number, hasApproved: boolean) => {
    if (hasApproved) {
      return alert("ไม่สามารถลบงวดงานนี้ได้ เนื่องจากมีบางโครงการได้รับการอนุมัติ (APPROVED) แล้ว");
    }

    if (!confirm("คุณแน่ใจหรือไม่ว่าต้องการลบงวดงานนี้? ข้อมูลโครงการและแผนงานทั้งหมดในงวดนี้จะถูกลบออกถาวร")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/center/cycles/${cycleId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        fetchData();
      } else {
        alert("Error: " + json.error);
      }
    } catch (e) {
      alert("Error deleting cycle");
    } finally {
      setLoading(false);
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
        ) : cycles.map((cycle) => (
          <div key={cycle.id} className="border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  {cycle.cycle_number}
                  <span className="text-xs font-normal px-2.5 py-1 bg-slate-200 text-slate-600 rounded-full">
                    {JSON.parse(cycle.target_months).length} เดือน
                  </span>
                </h3>
                <p className="text-sm text-slate-500 mt-1">เริ่ม: {cycle.start_date} | สิ้นสุด: {cycle.end_date}</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => openEditModal(cycle)}
                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-100"
                  title="แก้ไขโครงการในงวด"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDeleteCycle(cycle.id, cycle.jobs.some(j => j.status === "APPROVED"))}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-rose-100"
                  title="ลบงวดงานนี้"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {cycle.jobs.length === 0 && <div className="text-sm text-slate-400">ไม่มีโครงการในงวดนี้</div>}
              {cycle.jobs.map(job => {
                const project = projects.find(p => p.id === job.project_id);
                return (
                  <div key={job.id} className="border border-slate-100 p-3 rounded-lg flex justify-between items-center bg-slate-50/50 hover:border-slate-300 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-slate-700 truncate">{job.project_id}</div>
                      <div className="text-[11px] text-slate-600 truncate font-medium mb-0.5">{project?.name || "ไม่พบชื่อโครงการ"}</div>
                      <div className="text-[10px] text-slate-400 truncate">{job.job_number}</div>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-md border ${
                        job.status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        job.status === "SUBMITTED" ? "bg-amber-50 text-amber-700 border-amber-200" :
                        "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">เลือกเดือนเป้าหมาย (Target Months)</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {AVAILABLE_MONTHS.map(m => (
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
    </div>
  );
}
