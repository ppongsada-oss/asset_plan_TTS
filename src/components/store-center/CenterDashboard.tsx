"use client";

import { PackageSearch, ArrowRightLeft, RefreshCw, ShoppingCart, Loader2, Send, AlertTriangle, ArrowUpDown, ChevronUp, ChevronDown, History, Trash2, CheckCircle2, Search, Filter, CheckSquare, Square, Calendar, Layers, Download } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { useCenterRequests, useCenterAlerts } from "@/hooks/use-requests";
import ConfirmModal from "@/components/ui/ConfirmModal";
import useSWR from "swr";
import * as XLSX from "xlsx";

const fetcher = (url: string) => fetch(url).then(res => res.json());

type RequestItem = {
  id: number | string;
  project: string;
  project_code?: string;
  item_name: string;
  item_code: string;
  unit: string;
  month: string;
  qty: number;
  fulfilled_qty: number;
  status: string;
  remaining_stock: number;
  urgency: string;
  decisions?: any[];
  type: "DEMAND" | "RETURN";
};

const getActionInfo = (type: string) => {
  switch (type) {
    case "DISPATCH": return { label: "เบิกจ่าย", color: "text-indigo-700 bg-indigo-50 border-indigo-100 shadow-indigo-100/50" };
    case "CIRCULATE": return { label: "หมุนเวียน", color: "text-amber-700 bg-amber-50 border-amber-100 shadow-amber-100/50" };
    case "SUBSTITUTE": return { label: "สลับสเปก", color: "text-blue-700 bg-blue-50 border-blue-100 shadow-blue-100/50" };
    case "BUY": return { label: "จัดซื้อ", color: "text-emerald-700 bg-emerald-50 border-emerald-100 shadow-emerald-100/50" };
    case "RENT": return { label: "เช่า", color: "text-emerald-700 bg-emerald-50 border-emerald-100 shadow-emerald-100/50" };
    case "RECEIVE": return { label: "รับคืน", color: "text-emerald-700 bg-emerald-50 border-emerald-100 shadow-emerald-100/50" };
    case "REJECT_RETURN": return { label: "ปฏิเสธ", color: "text-rose-700 bg-rose-50 border-rose-100 shadow-rose-100/50" };
    default: return { label: type, color: "text-slate-700 bg-slate-50 border-slate-100 shadow-slate-100/50" };
  }
};

export default function CenterDashboard() {
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "READY" | "PENDING" | "COMPLETED">("ALL");
  const [filterCycleId, setFilterCycleId] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [viewMode, setViewMode] = useState<"DEMAND" | "RETURN">("DEMAND");

  // Fetch Cycles
  const { data: cyclesData } = useSWR("/api/center/cycles", fetcher);
  const cycles = cyclesData?.success ? (cyclesData.data as any[]) : [];

  const availableMonths = useMemo(() => {
    if (!filterCycleId) return [];
    const cycle = cycles.find(c => c.id.toString() === filterCycleId);
    if (!cycle?.target_months) return [];
    try {
      return JSON.parse(cycle.target_months) as string[];
    } catch {
      return [];
    }
  }, [filterCycleId, cycles]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { 
    requests, 
    isLoading: requestsLoading, 
    isValidating, 
    size, 
    setSize, 
    isReachingEnd, 
    mutate: mutateRequests,
    data,
    counts
  } = useCenterRequests({
    search: debouncedSearch,
    status: filterStatus,
    type: viewMode,
    cycleId: filterCycleId,
    month: filterMonth,
    limit: 50
  });

  const { alerts, mutate: mutateAlerts } = useCenterAlerts();
  const loading = requestsLoading && size === 1;
  const isError = requestsLoading === false && requests.length === 0 && !isValidating; // Not quite right
  
  // More accurate error check
  const apiError = data?.some(p => p.success === false);
  const errorMsg = data?.find(p => p.success === false)?.error;

  // Infinite Scroll Observer
  const observerTarget = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !isReachingEnd && !isValidating) {
          setSize(prev => prev + 1);
        }
      },
      { threshold: 1.0, rootMargin: "200px" }
    );
    if (observerTarget.current) observer.observe(observerTarget.current);
    return () => observer.disconnect();
  }, [isReachingEnd, isValidating, size, setSize]);

  // Modal State
  const [activeReq, setActiveReq] = useState<RequestItem | null>(null);
  const [actionType, setActionType] = useState<"DISPATCH" | "CIRCULATE" | "SUBSTITUTE" | "BUY" | "RENT" | "RECEIVE" | "REJECT_RETURN" | "">("");
  const [actionQty, setActionQty] = useState(0);
  const [notes, setNotes] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({ key: "", direction: null });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const [selectedIds, setSelectedIds] = useState<(number | string)[]>([]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const refreshData = () => {
    mutateRequests();
    mutateAlerts();
  };

  const openModal = (req: RequestItem, type: "DISPATCH" | "CIRCULATE" | "SUBSTITUTE" | "BUY" | "RECEIVE" | "REJECT_RETURN") => {
    setActiveReq(req);
    setActionType(type);
    setActionQty(req.qty - req.fulfilled_qty);
    setNotes("");
  };

  const handleSubmitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReq || !actionType) return;
    
    setSubmitting(true);
    try {
      const res = await fetch("/api/center/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: activeReq.id,
          action_type: actionType,
          notes: notes,
          qty: actionQty,
          total_qty: activeReq.qty
        })
      });
      const json = await res.json() as any;
      if (json.success) {
        setActiveReq(null);
        refreshData();
      } else {
        alert("Failed: " + json.error);
      }
    } catch (err) {
      alert("Error submitting decision");
    }
    setSubmitting(false);
  };

  const openHistoryModal = (req: RequestItem) => {
    setActiveReq(req);
    setShowHistory(true);
  };

  const handleDeleteDecision = async (decisionId: number) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/center/decisions?id=${decisionId}`, {
        method: "DELETE"
      });
      const json = await res.json() as any;
      
      if (json.success) {
        setSelectedIds([]);
        refreshData();
        setActiveReq(null);
        setShowHistory(false);
        setShowDeleteConfirm(false);
        setDeletingId(null);
      } else {
        alert("ลบไม่สำเร็จ: " + json.error);
      }
    } catch (err: any) {
      alert("เกิดข้อผิดพลาดขณะลบ: " + err.message);
    }
    setSubmitting(false);
  };
  
  const filteredRequests = useMemo(() => {
    return requests;
  }, [requests]);

  const sortedRequests = useMemo(() => {
    let result = [...filteredRequests];

    // First priority: Sort by completion (Incomplete first, Complete last)
    result.sort((a, b) => {
      const aDone = a.fulfilled_qty >= a.qty;
      const bDone = b.fulfilled_qty >= b.qty;
      if (aDone !== bDone) return aDone ? 1 : -1;

      // Second priority: User-defined sort config
      if (sortConfig.key && sortConfig.direction) {
        let aVal: any;
        let bVal: any;

        if (sortConfig.key === "project") {
          aVal = a.project;
          bVal = b.project;
        } else if (sortConfig.key === "item") {
          aVal = a.item_name;
          bVal = b.item_name;
        } else if (sortConfig.key === "month") {
          aVal = a.month;
          bVal = b.month;
        } else if (sortConfig.key === "qty") {
          aVal = a.qty;
          bVal = b.qty;
        } else if (sortConfig.key === "stock") {
          aVal = a.remaining_stock;
          bVal = b.remaining_stock;
        }

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
    return result;
  }, [filteredRequests, sortConfig]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(sortedRequests.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkDispatch = async () => {
    const toDispatch = requests.filter(r => selectedIds.includes(r.id) && r.remaining_stock >= (r.qty - r.fulfilled_qty) && r.fulfilled_qty < r.qty);
    if (toDispatch.length === 0) return;
    
    if (!confirm(`ยืนยันการเบิกจ่ายรายการที่เลือกจำนวน ${toDispatch.length} รายการ?`)) return;
    
    setSubmitting(true);
    try {
      for (const req of toDispatch) {
        await fetch("/api/center/decisions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan_id: req.id,
            action_type: "DISPATCH",
            notes: "Bulk Dispatch",
            qty: req.qty - req.fulfilled_qty,
            total_qty: req.qty
          })
        });
      }
      setSelectedIds([]);
      refreshData();
    } catch (err) {
      alert("Error in bulk dispatch");
    }
    setSubmitting(false);
  };

  const handleExport = async (exportAll = false) => {
    setExporting(true);
    setShowExportMenu(false);
    try {
      const commonParams = new URLSearchParams({
        limit: "5000",
        search: exportAll ? "" : debouncedSearch,
        status: exportAll ? "ALL" : filterStatus,
        cycle_id: filterCycleId,
        month: exportAll ? "" : filterMonth,
      });

      const [resDemand, resReturn] = await Promise.all([
        fetch(`/api/center/requests?${commonParams.toString()}&type=DEMAND`),
        fetch(`/api/center/requests?${commonParams.toString()}&type=RETURN`)
      ]);

      const dataDemand = await resDemand.json();
      const dataReturn = await resReturn.json();

      if (!dataDemand.success || !dataReturn.success) {
        alert("Failed to fetch data for export");
        return;
      }

      const demandRows = dataDemand.data.map((r: any, idx: number) => {
        const decisions = r.decisions || [];
        const actionStatus = decisions.map((d: any) => `${getActionInfo(d.action_type).label}: ${d.qty}`).join(", ");
        const latestNote = decisions.length > 0 ? decisions[decisions.length - 1].notes : "";

        return {
          '#': idx + 1,
          'โครงการ': r.project,
          'รหัสโครงการ': r.project_code || '-',
          'รายการอุปกรณ์': r.item_name,
          'รหัสอุปกรณ์': r.item_code,
          'หน่วย': r.unit,
          'เดือนที่ต้องการ': r.month,
          'จำนวน (Demand)': r.qty,
          'ดำเนินการแล้ว': r.fulfilled_qty,
          'คงเหลือ': r.qty - r.fulfilled_qty,
          'สต็อกคลังกลาง': r.remaining_stock,
          'ความสำคัญ': r.urgency,
          'สถานะการดำเนินการ': actionStatus || "รอดำเนินการ",
          'หมายเหตุล่าสุด': latestNote || "-",
        };
      });

      const returnRows = dataReturn.data.map((r: any, idx: number) => {
        const decisions = r.decisions || [];
        const actionStatus = decisions.map((d: any) => `${getActionInfo(d.action_type).label}: ${d.qty}`).join(", ");
        const latestNote = decisions.length > 0 ? decisions[decisions.length - 1].notes : "";

        return {
          '#': idx + 1,
          'โครงการ': r.project,
          'รหัสโครงการ': r.project_code || '-',
          'รายการอุปกรณ์': r.item_name,
          'รหัสอุปกรณ์': r.item_code,
          'หน่วย': r.unit,
          'เดือนที่ส่งคืน': r.month,
          'จำนวนที่คืน': r.qty,
          'รับคืนแล้ว': r.fulfilled_qty,
          'คงเหลือค้างรับ': r.qty - r.fulfilled_qty,
          'สต็อกคลังกลาง': r.remaining_stock,
          'สถานะการดำเนินการ': actionStatus || "รอดำเนินการ",
          'หมายเหตุล่าสุด': latestNote || "-",
        };
      });

      const wb = XLSX.utils.book_new();
      const wsDemand = XLSX.utils.json_to_sheet(demandRows);
      const wsReturn = XLSX.utils.json_to_sheet(returnRows);

      XLSX.utils.book_append_sheet(wb, wsDemand, "New Demand");
      XLSX.utils.book_append_sheet(wb, wsReturn, "Expected Returns");

      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = exportAll ? `StoreCenter_FullExport_${timestamp}.xlsx` : `StoreCenter_FilteredExport_${timestamp}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (error) {
      console.error("Export Error:", error);
      alert("เกิดข้อผิดพลาดในการส่งออกข้อมูล");
    } finally {
      setExporting(false);
    }
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') direction = 'desc';
      else if (sortConfig.direction === 'desc') direction = null;
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key || !sortConfig.direction) return <ArrowUpDown size={14} className="ml-1 opacity-20" />;
    if (sortConfig.direction === "asc") return <ChevronUp size={14} className="ml-1 text-indigo-600" />;
    return <ChevronDown size={14} className="ml-1 text-indigo-600" />;
  };

  return (
    <>
      {/* Alert Banner */}
      {alerts.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-5 mt-6 flex gap-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
          <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={22} />
          <div>
            <h3 className="font-bold text-rose-800 mb-2">แจ้งเตือน: สต็อกคลังกลางไม่เพียงพอต่อ Demand</h3>
            <ul className="space-y-1.5">
              {alerts.map(a => (
                <li key={a.id} className="text-sm text-rose-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  <strong>{a.code} {a.name}</strong>: ต้องการทั้งหมด {a.demand} ชิ้น แต่คลังมี {a.stock} ชิ้น 
                  <span className="font-bold ml-1 text-rose-900 bg-rose-200/50 px-2 py-0.5 rounded text-xs">(ต้องจัดหาเพิ่มอีก {a.shortage} ชิ้น)</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* API Error Banner */}
      {apiError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-6 flex items-center gap-3 text-amber-800 shadow-sm">
          <AlertTriangle className="shrink-0" size={20} />
          <div className="text-sm font-medium">
            เกิดข้อผิดพลาดในการโหลดข้อมูล: {errorMsg || "Unknown Error"}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6 relative">
      
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <PackageSearch size={20} className="text-indigo-600" />
            ตารางบริหารจัดการส่วนกลาง (Store Center Hub)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            รายการความต้องการสุทธิ (Net Demand) ที่ผ่านการคำนวณหักลบยอดของหน้างานแล้ว
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-100">
            High Urgency: {requests.filter(r => r?.urgency === "High").length}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 mr-2">
            Total Net Requests: {requests.length}
          </span>
          <div className="relative" ref={exportMenuRef}>
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Export ข้อมูล
              <ChevronDown size={14} className={`ml-1 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] overflow-hidden py-1">
                <button 
                  onClick={() => handleExport(false)}
                  className="w-full text-left px-4 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 border-b border-slate-100 flex items-center gap-2"
                >
                  <Filter size={14} className="text-slate-400" />
                  ส่งออกตามที่กรองไว้ (Filtered)
                </button>
                <button 
                  onClick={() => handleExport(true)}
                  className="w-full text-left px-4 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Download size={14} className="text-slate-400" />
                  ส่งออกทั้งหมด (Export All)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex bg-white px-6 border-b border-slate-200">
        <button 
          onClick={() => setViewMode("DEMAND")}
          className={`px-6 py-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${viewMode === "DEMAND" ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
        >
          <ShoppingCart size={18} />
          ใบขอเบิก/จัดหา (New Demand)
          <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${viewMode === "DEMAND" ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
            {counts.demand}
          </span>
        </button>
        <button 
          onClick={() => setViewMode("RETURN")}
          className={`px-6 py-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${viewMode === "RETURN" ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
        >
          <RefreshCw size={18} />
          รายการส่งคืน (Expected Returns)
          <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] ${viewMode === "RETURN" ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
            {counts.return}
          </span>
        </button>
      </div>

      {/* Search and Filters Row */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="ค้นหาชื่ออุปกรณ์ หรือโครงการ..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto border-r border-slate-200 pr-4 mr-2">
          <Layers size={16} className="text-slate-400 mr-1 shrink-0" />
          <select 
            value={filterCycleId}
            onChange={e => {
              setFilterCycleId(e.target.value);
              setFilterMonth(""); // Reset month when cycle changes
            }}
            className="bg-slate-100 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="">ทุกงวด (All Cycles)</option>
            {cycles.map(c => (
              <option key={c.id} value={c.id}>{c.cycle_number}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto border-r border-slate-200 pr-4 mr-2">
          <Calendar size={16} className="text-slate-400 mr-1 shrink-0" />
          <select 
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="bg-slate-100 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
            disabled={!filterCycleId && availableMonths.length === 0}
          >
            <option value="">{filterCycleId ? "เดือนทั้งหมดในงวด" : "เลือกงวดก่อน"}</option>
            {availableMonths.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 w-full md:w-auto">
          <Filter size={16} className="text-slate-400 mr-1 shrink-0" />
          <button 
            onClick={() => setFilterStatus("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${filterStatus === "ALL" ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            ทั้งหมด
          </button>
          <button 
            onClick={() => setFilterStatus("READY")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${filterStatus === "READY" ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            พร้อมเบิกจ่าย
          </button>
          <button 
            onClick={() => setFilterStatus("PENDING")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${filterStatus === "PENDING" ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            รอดำเนินการ
          </button>
          <button 
            onClick={() => setFilterStatus("COMPLETED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${filterStatus === "COMPLETED" ? 'bg-indigo-100 text-indigo-700 shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            จัดการแล้ว
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="overflow-x-auto min-h-[300px] custom-scrollbar">
        <table className="w-full text-left text-sm whitespace-nowrap border-separate border-spacing-0">
          <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 z-30">
            <tr>
              <th className="px-6 py-4 border-r border-b border-slate-200 text-center w-10 bg-slate-50 border-t-4 border-slate-300">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  onChange={handleSelectAll}
                  checked={selectedIds.length === sortedRequests.length && sortedRequests.length > 0}
                />
              </th>
              <th className="px-3 py-4 border-r border-b border-slate-200 text-center w-10 text-slate-400 bg-slate-50 border-t-4 border-slate-300">#</th>
              <th className="px-6 py-4 border-r border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors bg-slate-50 border-t-4 border-slate-300" onClick={() => requestSort("project")}>
                <div className="flex items-center">โครงการ (Project) {getSortIcon("project")}</div>
              </th>
              <th className="px-6 py-4 border-r border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors bg-slate-50 border-t-4 border-slate-300" onClick={() => requestSort("item")}>
                <div className="flex items-center">รายการอุปกรณ์ (Item) {getSortIcon("item")}</div>
              </th>
              <th className="px-6 py-4 border-r border-b border-slate-200 text-center cursor-pointer hover:bg-slate-100 transition-colors bg-slate-50 border-t-4 border-slate-300" onClick={() => requestSort("month")}>
                <div className="flex items-center justify-center">{viewMode === "DEMAND" ? "เดือนที่ต้องการ" : "เดือนที่คืน"} {getSortIcon("month")}</div>
              </th>
              <th className={`px-6 py-4 border-r border-b border-slate-200 text-center cursor-pointer hover:bg-slate-100 transition-colors bg-slate-50 border-t-4 border-slate-300 ${viewMode === "DEMAND" ? 'text-rose-600' : 'text-emerald-600'}`} onClick={() => requestSort("qty")}>
                <div className="flex items-center justify-center">{viewMode === "DEMAND" ? "Net Demand" : "Return Qty"} {getSortIcon("qty")}</div>
              </th>
              <th className="px-6 py-4 border-r border-b border-slate-200 text-center text-emerald-600 cursor-pointer hover:bg-slate-100 transition-colors bg-slate-50 border-t-4 border-slate-300" onClick={() => requestSort("stock")}>
                <div className="flex items-center justify-center">คลังกลางมีอยู่ {getSortIcon("stock")}</div>
              </th>
              <th className="px-3 py-4 border-r border-b border-slate-200 text-center text-indigo-600 w-[240px] bg-slate-50 border-t-4 border-slate-300">การจัดการ (Actions)</th>
              <th className="px-3 py-4 border-b border-slate-200 text-center text-slate-500 w-[120px] bg-slate-50 border-t-4 border-slate-300">สถานะ (Status)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="px-3 py-12 text-center text-slate-400"><Loader2 className="animate-spin mx-auto mb-2" size={24} />กำลังโหลดข้อมูล...</td></tr>
            ) : sortedRequests.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-12 text-center text-slate-400">ไม่มีรายการคำขอที่รอการจัดหา</td></tr>
            ) : sortedRequests.map((req, index) => (
              <tr key={`${req.project_code || req.project}-${req.equipment_id}-${req.month}-${req.type}`} className={`
                ${req.fulfilled_qty >= req.qty ? 'bg-slate-50/80 grayscale-[0.5] opacity-75' : 
                  selectedIds.includes(req.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50/50'} 
                transition-all duration-300
              `}>
                <td className="px-2 py-4 text-center border-r border-slate-50 w-10">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    checked={selectedIds.includes(req.id)}
                    onChange={() => toggleSelect(req.id)}
                  />
                </td>
                <td className="px-2 py-4 text-center text-slate-400 font-mono text-[10px] border-r border-slate-50 w-10">
                  {index + 1}
                </td>
                <td className={`px-3 py-4 font-medium border-r border-slate-50 max-w-[150px] whitespace-normal ${req?.fulfilled_qty >= req?.qty ? 'text-slate-400' : 'text-slate-800'}`} title={`รหัสโครงการ: ${req?.project_code || '-'}`}>
                  {req?.project}
                  {req?.urgency === "High" && req?.fulfilled_qty < req?.qty && <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>}
                </td>
                <td className={`px-3 py-4 border-r border-slate-50 max-w-[200px] whitespace-normal ${req.fulfilled_qty >= req.qty ? 'text-slate-400' : ''}`}>
                  <div className={`font-bold text-sm ${req.fulfilled_qty >= req.qty ? 'text-slate-400' : 'text-slate-800'}`}>
                    {req.item_name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                    {req.item_code} ({req.unit})
                  </div>
                </td>
                <td className="px-2 py-4 text-center w-20">
                  <span className={`px-1.5 py-0.5 rounded text-[11px] font-mono ${req.fulfilled_qty >= req.qty ? 'bg-slate-100 text-slate-400' : 'bg-slate-100 text-slate-600'}`}>{req.month}</span>
                </td>
                <td className={`px-2 py-4 text-center font-bold ${req.fulfilled_qty >= req.qty ? 'text-slate-300' : req.type === 'DEMAND' ? 'text-rose-600' : 'text-emerald-600'}`}>
                  <div className="flex flex-col items-center">
                    <span className="text-base">+{req.qty}</span>
                    {req.fulfilled_qty > 0 && (
                      <div className="mt-1 w-full max-w-[60px]">
                        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${req.fulfilled_qty >= req.qty ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                            style={{ width: `${Math.min(100, (req.fulfilled_qty / req.qty) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-2 py-4 text-center font-bold text-emerald-600 w-20">
                  {req.remaining_stock}
                </td>

                {/* Actions Column: Horizontal Layout */}
                <td className="px-3 py-4 w-[240px]">
                  <div className="flex items-center justify-center">
                    {req.fulfilled_qty < req.qty ? (
                      <div className="flex flex-row items-center gap-1">
                        {viewMode === "DEMAND" ? (
                          <>
                            <button onClick={() => openModal(req, "DISPATCH")} disabled={req.remaining_stock < (req.qty - req.fulfilled_qty)} className="p-1.5 text-indigo-700 bg-indigo-50 border border-indigo-100 rounded hover:bg-indigo-100 transition-colors disabled:opacity-40" title="เบิกจ่าย">
                              <Send size={14} />
                            </button>
                            <button onClick={() => openModal(req, "CIRCULATE")} className="p-1.5 text-amber-700 bg-amber-50 border border-amber-100 rounded hover:bg-amber-100 transition-colors" title="หมุนเวียน">
                              <RefreshCw size={14} />
                            </button>
                            <button onClick={() => openModal(req, "SUBSTITUTE")} className="p-1.5 text-blue-700 bg-blue-50 border border-blue-100 rounded hover:bg-blue-100 transition-colors" title="สลับสเปก">
                              <ArrowRightLeft size={14} />
                            </button>
                            <button onClick={() => openModal(req, "BUY")} className="p-1.5 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded hover:bg-emerald-100 transition-colors" title="จัดหา">
                              <ShoppingCart size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => openModal(req, "RECEIVE")} className="px-2 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded hover:bg-emerald-100 transition-colors" title="รับคืน">
                              <CheckCircle2 size={12} className="inline mr-1" />
                              รับคืน
                            </button>
                            <button onClick={() => openModal(req, "REJECT_RETURN")} className="px-2 py-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded hover:bg-rose-100 transition-colors" title="ปฏิเสธ">
                              <Trash2 size={12} className="inline mr-1" />
                              ปฏิเสธ
                            </button>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                        <CheckCircle2 size={12} />
                        Completed
                      </div>
                    )}
                  </div>
                </td>
                
                {/* Status Column: Vertical Layout at the End */}
                <td className="px-3 py-4 text-center border-l border-slate-50 w-[120px]">
                  <div className="flex flex-col gap-1 items-center">
                    {req.fulfilled_qty > 0 ? (
                      <>
                        {req.decisions?.map((d, idx) => {
                          const info = getActionInfo(d.action_type);
                          return (
                            <div 
                              key={idx}
                              className={`group relative flex items-center justify-center w-full max-w-[90px] px-1.5 py-0.5 rounded text-[9px] font-bold border ${info.color} transition-all hover:shadow-md cursor-help`}
                            >
                              {info.label.substring(0, 4)}: {d.qty}
                              
                              <div className="absolute bottom-full right-0 mb-2 w-52 p-2 bg-slate-800 text-white text-[10px] font-normal rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-2xl z-50">
                                <div className="font-bold border-b border-slate-600 mb-1 pb-1 flex justify-between items-center">
                                  <span>{info.label}</span>
                                  <span className="text-[9px] text-slate-400">{new Date(d.created_at).toLocaleDateString('th-TH')}</span>
                                </div>
                                <div className="flex justify-between mt-1">
                                  <span>จำนวน:</span>
                                  <span className="font-bold">{d.qty} {req.unit}</span>
                                </div>
                                {d.notes && (
                                  <div className="mt-1.5 pt-1.5 border-t border-slate-700 text-slate-300 italic line-clamp-2 text-left whitespace-normal">
                                    "{d.notes}"
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        <button 
                          onClick={() => openHistoryModal(req)} 
                          className="flex items-center gap-1 mt-1 px-1.5 py-0.5 text-[9px] font-bold text-slate-500 hover:text-indigo-600 hover:bg-white border border-slate-200 hover:border-indigo-200 rounded transition-all shadow-sm bg-white"
                        >
                          <History size={10} />
                          แก้ไข
                        </button>
                      </>
                    ) : (
                      <span className="text-slate-300 text-[10px]">-</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Infinite Scroll Target */}
      {!isReachingEnd && (
        <div ref={observerTarget} className="py-12 flex justify-center items-center bg-slate-50/30 border-t border-slate-100">
          <Loader2 className="animate-spin text-indigo-600 mr-2" size={20} />
          <span className="text-sm text-slate-500 font-medium">กำลังโหลดข้อมูลเพิ่มเติม...</span>
        </div>
      )}
      {isReachingEnd && requests.length > 0 && (
        <div className="py-10 text-center text-slate-400 text-sm border-t border-slate-100 bg-slate-50/20">
          — แสดงรายการทั้งหมดแล้ว ({requests.length} รายการ) —
        </div>
      )}

      {/* Action Modal */}
      {activeReq && !showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800">
                  {actionType === "DISPATCH" ? "เบิกจ่ายจากคลัง (Dispatch)" :
                   actionType === "CIRCULATE" ? "หมุนเวียนอุปกรณ์ (Circulate)" :
                   actionType === "SUBSTITUTE" ? "สลับสเปก (Substitute)" :
                   actionType === "RECEIVE" ? "รับสินค้าคืน (Receive Return)" :
                   actionType === "REJECT_RETURN" ? "ปฏิเสธการคืน (Reject Return)" : "จัดหาอุปกรณ์ (Buy/Rent)"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">{activeReq.item_name} • {activeReq.project} • Demand: {activeReq.qty}</p>
              </div>
              <button onClick={() => setActiveReq(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
            </div>

            <form onSubmit={handleSubmitDecision} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">จำนวนที่ดำเนินการ (Quantity)</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    min={1} 
                    max={activeReq.qty - activeReq.fulfilled_qty} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    value={actionQty}
                    onChange={e => setActionQty(parseInt(e.target.value))}
                    required
                  />
                  <span className="text-sm text-slate-500 whitespace-nowrap">/ {activeReq.qty - activeReq.fulfilled_qty} (คงเหลือ)</span>
                </div>
              </div>

              {(actionType === "BUY" || actionType === "RENT") && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-700">เลือกประเภทการจัดหา:</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer flex-1 hover:bg-slate-50">
                      <input type="radio" name="procureType" checked={actionType === "BUY"} onChange={() => setActionType("BUY")} className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium">สั่งซื้อใหม่ (Buy)</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer flex-1 hover:bg-slate-50">
                      <input type="radio" name="procureType" checked={actionType === "RENT"} onChange={() => setActionType("RENT")} className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium">เช่า (Rent)</span>
                    </label>
                  </div>
                </div>
              )}

              {actionType === "DISPATCH" && (
                <div className="bg-indigo-50 text-indigo-800 p-4 rounded-lg text-sm">
                  ระบบจะทำการตัดยอด <strong>Remaining Stock</strong> ในคลังกลางจำนวน {actionQty} ชิ้นโดยอัตโนมัติ
                </div>
              )}

              {actionType === "RECEIVE" && (
                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg text-sm">
                  ระบบจะทำการเพิ่มยอด <strong>Remaining Stock</strong> ในคลังกลางจำนวน {actionQty} ชิ้นโดยอัตโนมัติ
                </div>
              )}

              {actionType === "REJECT_RETURN" && (
                <div className="bg-rose-50 text-rose-800 p-4 rounded-lg text-sm">
                  ระบบจะทำการเพิ่มยอด <strong>Asset Plan</strong> ของโครงการคืนกลับไปจำนวน {actionQty} ชิ้น เพื่อระบุว่าโครงการไม่คืนของรายการนี้แล้ว
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">บันทึกเพิ่มเติม (Notes)</label>
                <textarea 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[100px]"
                  placeholder={
                    actionType === "CIRCULATE" ? "เช่น ดึงของมาจากโครงการ P2..." :
                    actionType === "SUBSTITUTE" ? "เช่น เปลี่ยนไปใช้สเปก HM-023 แทน..." :
                    "ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
                  }
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  required={actionType === "CIRCULATE" || actionType === "SUBSTITUTE"}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setActiveReq(null)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">ยกเลิก</button>
                <button type="submit" disabled={submitting} className="px-6 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50">
                  {submitting ? "กำลังบันทึก..." : 
                   actionType === "RECEIVE" ? "ยืนยันการรับคืน" :
                   actionType === "REJECT_RETURN" ? "ยืนยันการปฏิเสธ" : "ยืนยันมติการจัดหา"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {activeReq && showHistory && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <History size={20} className="text-indigo-600" />
                  ประวัติการดำเนินการ
                </h3>
                <p className="text-xs text-slate-500 mt-1">{activeReq.item_name} • {activeReq.project}</p>
              </div>
              <button onClick={() => { setActiveReq(null); setShowHistory(false); }} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
            </div>

            <div className="p-6 max-h-[400px] overflow-y-auto">
              {activeReq.decisions && activeReq.decisions.length > 0 ? (
                <div className="space-y-4">
                  {activeReq.decisions.map((d: any) => (
                    <div key={d.id} className="p-4 border border-slate-100 rounded-xl bg-slate-50 flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            d.action_type === 'DISPATCH' ? 'bg-indigo-100 text-indigo-700' :
                            d.action_type === 'BUY' ? 'bg-emerald-100 text-emerald-700' :
                            d.action_type === 'RENT' ? 'bg-emerald-100 text-emerald-700' :
                            d.action_type === 'RECEIVE' ? 'bg-emerald-100 text-emerald-700' :
                            d.action_type === 'REJECT_RETURN' ? 'bg-rose-100 text-rose-700' :
                            d.action_type === 'CIRCULATE' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {d.action_type}
                          </span>
                          <span className="font-bold text-slate-700">จำนวน {d.qty}</span>
                        </div>
                        <p className="text-sm text-slate-600">{d.notes || "ไม่มีหมายเหตุ"}</p>
                        <p className="text-[10px] text-slate-400 mt-2">{new Date(d.created_at).toLocaleString('th-TH')}</p>
                      </div>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeletingId(d.id);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        title="ยกเลิกรายการนี้"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">ยังไม่มีประวัติการดำเนินการ</div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end">
              <button onClick={() => { setActiveReq(null); setShowHistory(false); }} className="px-6 py-2 bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 rounded-lg transition-colors">ปิด</button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Selection Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 pr-6 border-r border-slate-700">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-sm">
              {selectedIds.length}
            </div>
            <span className="text-sm font-medium">รายการที่เลือก</span>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleBulkDispatch}
              disabled={submitting}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
            >
              <Send size={16} />
              Bulk Dispatch (เบิกจ่ายรวม)
            </button>
            <button 
              onClick={() => setSelectedIds([])}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-all"
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}
      
      {/* Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setDeletingId(null); }}
        onConfirm={() => deletingId && handleDeleteDecision(deletingId)}
        title="ยกเลิกการดำเนินการ"
        message="คุณต้องการยกเลิกการดำเนินการนี้ใช่หรือไม่? ระบบจะทำการคืนค่าสต็อกหรือยอดแผนงานให้โดยอัตโนมัติ"
        confirmText="ยืนยันการลบ"
        cancelText="ยกเลิก"
        type="danger"
        isLoading={submitting}
      />
    </div>
    </>
  );
}
