"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { useToast } from "@/hooks/useToast";
import { Building2, Search, Archive, CheckCircle2, Plus, Warehouse, HardHat, Package, Pencil } from "lucide-react";
import { Loader2 } from "lucide-react";

type Project = {
  id: string;
  name: string;
  type: "SITE" | "WAREHOUSE";
  status: "ACTIVE" | "ARCHIVED";
  created_at: string;
  site_assets_count: number;
  inventory_list?: { name: string; qty: number }[];
};

type ProjectApiRow = Omit<Project, "inventory_list" | "site_assets_count"> & {
  inventory_list?: Project["inventory_list"] | string | null;
  site_assets_count: number | string;
};

type ProjectsApiResponse = {
  success: boolean;
  data: ProjectApiRow[];
  error?: string;
};

type ProjectsResponse = {
  success: boolean;
  data: Project[];
  error?: string;
};

const normalizeProject = (project: ProjectApiRow): Project => ({
  ...project,
  site_assets_count: Number(project.site_assets_count || 0),
  inventory_list: (() => {
    const parsed = typeof project.inventory_list === "string"
      ? JSON.parse(project.inventory_list) as Project["inventory_list"]
      : (project.inventory_list || []);

    const deduped = new Map<string, number>();
    for (const item of parsed || []) {
      if (!item?.name) continue;
      deduped.set(item.name, Math.max(deduped.get(item.name) || 0, Number(item.qty || 0)));
    }

    return Array.from(deduped.entries()).map(([name, qty]) => ({ name, qty }));
  })()
});

export default function ProjectManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "SITE" | "WAREHOUSE">("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ id: "", name: "", type: "SITE" as "SITE" | "WAREHOUSE", status: "ACTIVE" as "ACTIVE" | "ARCHIVED" });
  const [creating, setCreating] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ id: "", name: "", type: "SITE" as "SITE" | "WAREHOUSE", status: "ACTIVE" as "ACTIVE" | "ARCHIVED" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { data, isLoading, mutate } = useSWR<ProjectsResponse>(
    "/api/admin/projects",
    async (url: string) => {
      const res = await fetch(url);
      const json = await res.json() as ProjectsApiResponse;
      return {
        ...json,
        data: (json.data || []).map(normalizeProject)
      };
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      keepPreviousData: true,
    }
  );
  const projects = useMemo(() => data?.data || [], [data?.data]);

  const handleUpdateStatus = async (id: string, newStatus: "ACTIVE" | "ARCHIVED") => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (json.success) {
        await mutate(
          (current) => current ? {
            ...current,
            data: current.data.map((p) => p.id === id ? { ...p, status: newStatus } : p)
          } : current,
          false
        );
      }
    } catch (e) {
      console.error(e);
    }
    setUpdatingId(null);
  };

  const handleCreate = async () => {
    if (!addForm.id.trim() || !addForm.name.trim()) {
      toast.info("กรุณากรอกรหัสและชื่อโครงการ");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (json.success) {
        toast.success("เพิ่มโครงการสำเร็จ");
        setShowAddModal(false);
        setAddForm({ id: "", name: "", type: "SITE", status: "ACTIVE" });
        await mutate();
      } else {
        toast.error(json.error || "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
    setCreating(false);
  };

  const openEditModal = (p: Project) => {
    setEditForm({ id: p.id, name: p.name, type: p.type, status: p.status });
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    if (!editForm.name.trim()) {
      toast.info("กรุณากรอกชื่อโครงการ");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editForm.id, name: editForm.name, type: editForm.type, status: editForm.status }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (json.success) {
        toast.success("แก้ไขโครงการสำเร็จ");
        setShowEditModal(false);
        await mutate(
          (current) => current ? {
            ...current,
            data: current.data.map((p) => p.id === editForm.id ? { ...p, ...editForm } : p)
          } : current,
          false
        );
      } else {
        toast.error(json.error || "เกิดข้อผิดพลาด");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
    }
    setSaving(false);
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === "ALL" || p.type === filterType;
      const matchesStatus = filterStatus === "ALL" || p.status === filterStatus;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [projects, searchTerm, filterType, filterStatus]);

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Building2 className="text-indigo-600" size={32} />
            Project Management
          </h1>
          <p className="text-slate-500 mt-1">จัดการไซต์งานก่อสร้าง และคลังสินค้าทั้งหมดในระบบ</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-md"
          >
            <Plus size={18} />
            เพิ่มโครงการ
          </button>
          <div className="px-4 py-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center gap-6">
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Active Sites</p>
              <p className="text-xl font-bold text-indigo-600">{projects.filter(p => p.status === "ACTIVE" && p.type === "SITE").length}</p>
            </div>
            <div className="w-px h-8 bg-slate-100"></div>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Warehouses</p>
              <p className="text-xl font-bold text-emerald-600">{projects.filter(p => p.type === "WAREHOUSE").length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search by name or code..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <button 
            onClick={() => setFilterType("ALL")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterType === "ALL" ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            ทั้งหมด
          </button>
          <button 
            onClick={() => setFilterType("SITE")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterType === "SITE" ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            ไซต์งาน (Site)
          </button>
          <button 
            onClick={() => setFilterType("WAREHOUSE")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterType === "WAREHOUSE" ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            คลังสินค้า (Warehouse)
          </button>
          <div className="w-px h-6 bg-slate-200 mx-1"></div>
          <button 
            onClick={() => setFilterStatus(filterStatus === "ARCHIVED" ? "ALL" : "ARCHIVED")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${filterStatus === "ARCHIVED" ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            <Archive size={14} />
            Archived
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
          <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
          <p className="text-slate-500 font-medium">กำลังโหลดข้อมูลโครงการ...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((p) => (
            <div 
              key={p.id} 
              className={`group bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 relative hover:z-20 flex flex-col h-full ${p.status === 'ARCHIVED' ? 'opacity-60 grayscale-[0.5]' : ''}`}
            >
              {/* Status Badge */}
              <div className="absolute top-4 right-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  p.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}>
                  {p.status}
                </span>
              </div>

              <div className="flex items-start gap-4 mb-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                  p.type === 'WAREHOUSE' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                }`}>
                  {p.type === 'WAREHOUSE' ? <Warehouse size={28} /> : <HardHat size={28} />}
                </div>
                <div className="pr-12">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{p.id}</p>
                  <h3 className="text-lg font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2 min-h-[3rem]">{p.name}</h3>
                </div>
              </div>

              <div className="mt-auto">
                <div className="h-8 flex items-center">
                  {p.site_assets_count > 0 ? (
                    <div className="relative group/tooltip">
                      <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg w-fit border border-blue-100 cursor-help">
                        <Package size={12} className="shrink-0" />
                        <span className="text-[10px] font-bold">{p.site_assets_count} รายการอุปกรณ์ที่ Site</span>
                      </div>
                      
                      {/* Tooltip Content */}
                      <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-100 p-3 z-50 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 transform translate-y-2 group-hover/tooltip:translate-y-0">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 border-b border-slate-50 pb-2">รายการอุปกรณ์คงค้าง</p>
                        <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                          {p.inventory_list?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center gap-2">
                              <span className="text-xs text-slate-600 truncate flex-1">{item.name}</span>
                              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">{item.qty.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[10px] font-bold text-slate-300 px-2.5 py-1">ไม่มีอุปกรณ์คงค้าง</div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-2">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                    p.type === 'WAREHOUSE' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    {p.type}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(p)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-xl text-xs font-bold transition-all"
                      title="Edit Project"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                    {p.status === "ACTIVE" ? (
                      <button 
                        onClick={() => handleUpdateStatus(p.id, "ARCHIVED")}
                        disabled={updatingId === p.id}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-amber-50 hover:text-amber-700 text-slate-600 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                        title="Archive Project"
                      >
                        <Archive size={14} />
                        {updatingId === p.id ? "Wait..." : "Archive"}
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleUpdateStatus(p.id, "ACTIVE")}
                        disabled={updatingId === p.id}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} />
                        {updatingId === p.id ? "Wait..." : "Activate"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {filteredProjects.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
              <Search className="mx-auto mb-4 opacity-20" size={48} />
              <p className="text-lg font-medium">ไม่พบโครงการที่ค้นหา</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-slate-800 mb-1">แก้ไขโครงการ</h2>
            <p className="text-xs text-slate-400 mb-5 font-mono">{editForm.id}</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ชื่อโครงการ *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1.5 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ประเภท</label>
                  <select
                    value={editForm.type}
                    onChange={e => setEditForm(prev => ({ ...prev, type: e.target.value as "SITE" | "WAREHOUSE" }))}
                    className="mt-1.5 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                  >
                    <option value="SITE">ไซต์งาน (Site)</option>
                    <option value="WAREHOUSE">คลังสินค้า (Warehouse)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะ</label>
                  <select
                    value={editForm.status}
                    onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value as "ACTIVE" | "ARCHIVED" }))}
                    className="mt-1.5 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-200 transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleEdit}
                disabled={saving}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-slate-800 mb-5">เพิ่มโครงการใหม่</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">รหัสโครงการ *</label>
                <input
                  type="text"
                  value={addForm.id}
                  onChange={e => setAddForm(prev => ({ ...prev, id: e.target.value.toUpperCase() }))}
                  placeholder="เช่น PROJ-001"
                  className="mt-1.5 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ชื่อโครงการ *</label>
                <input
                  type="text"
                  value={addForm.name}
                  onChange={e => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="ชื่อโครงการ / ไซต์งาน"
                  className="mt-1.5 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ประเภท</label>
                  <select
                    value={addForm.type}
                    onChange={e => setAddForm(prev => ({ ...prev, type: e.target.value as "SITE" | "WAREHOUSE" }))}
                    className="mt-1.5 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                  >
                    <option value="SITE">ไซต์งาน (Site)</option>
                    <option value="WAREHOUSE">คลังสินค้า (Warehouse)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">สถานะ</label>
                  <select
                    value={addForm.status}
                    onChange={e => setAddForm(prev => ({ ...prev, status: e.target.value as "ACTIVE" | "ARCHIVED" }))}
                    className="mt-1.5 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowAddModal(false); setAddForm({ id: "", name: "", type: "SITE", status: "ACTIVE" }); }}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl text-sm font-bold hover:bg-slate-200 transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {creating ? "กำลังบันทึก..." : "เพิ่มโครงการ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
