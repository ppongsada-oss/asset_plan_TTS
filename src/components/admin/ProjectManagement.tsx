"use client";

import { useState, useEffect, useMemo } from "react";
import { Building2, Search, Filter, Archive, CheckCircle2, MoreVertical, Plus, Trash2, Warehouse, HardHat, ChevronRight, FileText, Package } from "lucide-react";
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

export default function ProjectManagement() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | "SITE" | "WAREHOUSE">("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "ACTIVE" | "ARCHIVED">("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/projects");
      const json = await res.json();
      if (json.success) {
        setProjects(json.data.map((p: any) => ({ 
          ...p, 
          site_assets_count: Number(p.site_assets_count || 0),
          inventory_list: typeof p.inventory_list === 'string' ? JSON.parse(p.inventory_list) : p.inventory_list
        })));
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: "ACTIVE" | "ARCHIVED") => {
    setUpdatingId(id);
    try {
      const res = await fetch("/api/admin/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
      }
    } catch (e) {
      console.error(e);
    }
    setUpdatingId(null);
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
      {loading ? (
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
    </div>
  );
}
