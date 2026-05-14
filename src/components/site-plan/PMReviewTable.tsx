"use client";

import { PackageSearch, ArrowUpDown, ChevronUp, ChevronDown, FileSearch, Save, Send, AlertCircle, Loader2, Search, RefreshCw, TrendingUp, TrendingDown, CheckCircle, XCircle } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import ConfirmModal from "@/components/ui/ConfirmModal";

type Equipment = {
  id: number;
  item_code: string;
  name: string;
  unit: string;
};

type PlanEntry = {
  equipment_id: number;
  month: string;
  required_qty: number;
};

type Job = {
  id: number;
  project_id: string;
  job_number: string;
  status: string;
  target_months: string; // JSON string
};

type Props = {
  jobId?: number;
};

export default function PMReviewTable({ jobId: propJobId }: Props) {
  const [job, setJob] = useState<Job | null>(null);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [plans, setPlans] = useState<Record<number, Record<string, number>>>({}); // equipment_id -> month -> qty
  const [prevPlans, setPrevPlans] = useState<Record<number, number>>({});
  const [siteInventory, setSiteInventory] = useState<Record<number, number>>({});
  const [originalPlans, setOriginalPlans] = useState<Record<number, Record<string, number>>>({}); 
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<"ALL" | "DEMAND" | "RETURN" | "CHANGED">("ALL");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({ key: "", direction: null });
  
  // Modal states
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");

  useEffect(() => {
    fetchData();
  }, [propJobId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch specific job or first SUBMITTED job
      let jobToReview = null;
      
      if (propJobId) {
        const res = await fetch(`/api/site/jobs/${propJobId}`).then(res => res.json());
        if (res.success) jobToReview = res.data;
      } else {
        // Fallback for backward compatibility/quick link: find any SUBMITTED job the user can see
        const jobsRes = await fetch("/api/site/jobs").then(res => res.json());
        if (jobsRes.success) {
          jobToReview = jobsRes.data.find((j: any) => j.status === "SUBMITTED");
        }
      }

      if (!jobToReview) {
        setJob(null);
        setLoading(false);
        return;
      }
      setJob(jobToReview);

      // 2. Fetch Equipments and Plans
      const [eqRes, plansRes] = await Promise.all([
        fetch("/api/equipment").then(res => res.json()),
        fetch(`/api/site/plans?job_id=${jobToReview.id}`).then(res => res.json())
      ]);

      if (eqRes.success) setEquipments(eqRes.data);
      
      const planMap: Record<number, Record<string, number>> = {};
      if (plansRes.success) {
        plansRes.data.forEach((p: any) => {
          if (!planMap[p.equipment_id]) planMap[p.equipment_id] = {};
          planMap[p.equipment_id][p.month] = p.required_qty;
        });
        
        // Handle previous month plans if available
        if (plansRes.previous_month_plans) {
          const pmMap: Record<number, number> = {};
          plansRes.previous_month_plans.forEach((p: any) => {
            pmMap[p.equipment_id] = p.required_qty;
          });
          setPrevPlans(pmMap);
        }

        // Handle Site Inventory (Remaining Stock)
        if (plansRes.inventory) {
          const invMap: Record<number, number> = {};
          plansRes.inventory.forEach((i: any) => {
            invMap[i.equipment_id] = i.qty;
          });
          setSiteInventory(invMap);
        }
      }
      setPlans(planMap);
      setOriginalPlans(JSON.parse(JSON.stringify(planMap))); // Deep copy for change tracking

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const targetMonths = useMemo(() => {
    if (!job?.target_months) return [];
    try {
      return JSON.parse(job.target_months) as string[];
    } catch {
      return [];
    }
  }, [job]);

  const filteredAndSortedEquipments = useMemo(() => {
    let result = equipments.filter(item => {
      const hasPlan = plans[item.id] !== undefined;
      // Show if has plan OR search OR it's one of the first 200 items (allow adding new items easily)
      const shouldShow = searchTerm.length > 0 || hasPlan || equipments.indexOf(item) < 200; 
      
      if (!shouldShow) return false;
      
      // Search filtering
      const lowerSearch = searchTerm.toLowerCase();
      const matchesSearch = item.name.toLowerCase().includes(lowerSearch) || 
                            item.item_code.toLowerCase().includes(lowerSearch);
      
      if (!matchesSearch) return false;

      // Type filtering
      if (filterMode === "ALL") return true;

      const itemPlans = plans[item.id] || {};
      const itemOrig = originalPlans[item.id] || {};
      
      let itemDemand = 0;
      let itemReturn = 0;
      let isChanged = false;
      let current = prevPlans[item.id] || 0;
      
      targetMonths.forEach(m => {
        const p = itemPlans[m] ?? 0;
        const o = itemOrig[m] ?? 0;
        if (p !== o) isChanged = true;
        
        const d = p - current;
        if (d > 0) itemDemand += d;
        else if (d < 0) itemReturn += Math.abs(d);
        current = p;
      });

      if (filterMode === "DEMAND") return itemDemand > 0;
      if (filterMode === "RETURN") return itemReturn > 0;
      if (filterMode === "CHANGED") return isChanged;

      return true;
    });

    if (sortConfig.key && sortConfig.direction) {
      result.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        if (sortConfig.key === "item") {
          aVal = a.item_code + a.name;
          bVal = b.item_code + b.name;
        } else {
          // Month columns
          aVal = plans[a.id]?.[sortConfig.key] || 0;
          bVal = plans[b.id]?.[sortConfig.key] || 0;
        }

        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [equipments, plans, originalPlans, prevPlans, targetMonths, searchTerm, filterMode, sortConfig]);

  // Quarterly Summary Calculations
  const quarterlySummary = useMemo(() => {
    let totalDemand = 0;
    let totalReturn = 0;

    equipments.forEach(item => {
      // Use siteInventory (Actual Stock) as the starting point for the cycle
      let currentOwned = siteInventory[item.id] || 0;
      targetMonths.forEach(month => {
        const planned = plans[item.id]?.[month] ?? 0;
        const delta = planned - currentOwned;
        if (delta > 0) totalDemand += delta;
        else if (delta < 0) totalReturn += Math.abs(delta);
        currentOwned = planned;
      });
    });

    return { totalDemand, totalReturn };
  }, [equipments, plans, prevPlans, targetMonths]);

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

  const isReadOnly = job?.status !== "SUBMITTED";

  const handleQtyChange = (equipmentId: number, month: string, val: string) => {
    if (isReadOnly) return;
    const num = parseInt(val) || 0;
    setPlans(prev => ({
      ...prev,
      [equipmentId]: {
        ...(prev[equipmentId] || {}),
        [month]: num
      }
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nextRowIndex = rowIndex + 1;
      const nextInput = document.getElementById(`pm-input-${nextRowIndex}-0`);
      if (nextInput) {
        (nextInput as HTMLInputElement).focus();
      }
    }
  };

  const getChanges = () => {
    const changes: any[] = [];
    Object.entries(plans).forEach(([eqIdStr, months]) => {
      const eqId = parseInt(eqIdStr);
      Object.entries(months).forEach(([month, newQty]) => {
        const oldQty = originalPlans[eqId]?.[month] ?? 0;
        if (newQty !== oldQty) {
          changes.push({ equipment_id: eqId, month, old_qty: oldQty, new_qty: newQty });
        }
      });
    });
    return changes;
  };

  const hasChanges = getChanges().length > 0;

  const handleSaveEdits = async () => {
    if (!job) return false;
    setSaving(true);
    try {
      // 1. Prepare items to save
      const changedItems: any[] = [];
      Object.entries(plans).forEach(([equipmentId, monthData]) => {
        const eqId = parseInt(equipmentId);
        Object.entries(monthData).forEach(([month, qty]) => {
          const originalQty = originalPlans[eqId]?.[month] ?? 0;
          if (qty !== originalQty) {
            changedItems.push({
              equipment_id: eqId,
              month,
              old_qty: originalQty,
              new_qty: qty
            });
          }
        });
      });

      if (changedItems.length === 0) {
        setSaveModalOpen(false);
        return true;
      }

      // 2. Save via API
      const res = await fetch("/api/pm/plans/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: job.id,
          project_id: job.project_id,
          changes: changedItems
        })
      });

      const data = await res.json() as any;
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save edits");
      }

      alert("บันทึกการแก้ไขสำเร็จ");
      setOriginalPlans(JSON.parse(JSON.stringify(plans)));
      return true;
    } catch (err: any) {
      alert(`ไม่สามารถบันทึกได้: ${err.message}`);
      return false;
    } finally {
      setSaving(false);
      setSaveModalOpen(false);
    }
  };

  const handleApprove = async () => {
    if (!job) return;
    
    // If there are changes, save them first. If save fails, stop approval.
    if (hasChanges) {
      const saveSuccess = await handleSaveEdits();
      if (!saveSuccess) return; 
    }

    setSaving(true);
    try {
      const res = await fetch("/api/pm/jobs/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: job.id })
      });
      if (!res.ok) throw new Error("Approval failed");
      alert("อนุมัติสำเร็จ! แผนงานถูกส่งเข้าคลังกลางแล้ว");
      window.location.href = "/site-plan/pm-approval";
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!job) return;
    setSaving(true);
    try {
      const res = await fetch("/api/pm/jobs/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: job.id, notes: rejectNotes })
      });
      
      const data = await res.json() as any;
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Rejection failed");
      }
      
      alert("ตีกลับแผนงานสำเร็จ");
      window.location.href = "/site-plan/pm-approval";
    } catch (err: any) {
      console.error("Reject Error:", err);
      alert(`ไม่สามารถตีกลับได้: ${err.message}`);
    } finally {
      setSaving(false);
      setRejectModalOpen(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-500 flex justify-center items-center gap-2 mt-6"><Loader2 className="animate-spin" /> Loading review data...</div>;
  
  if (!job) return (
    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center mt-6">
      <AlertCircle className="mx-auto text-slate-300 mb-4" size={48} />
      <h3 className="text-xl font-bold text-slate-800">ไม่มีแผนงานที่รอการอนุมัติ</h3>
      <p className="text-slate-500 mt-2">ขณะนี้ยังไม่มี Store Site ส่งแผนงานเข้ามา หรือแผนงานทั้งหมดได้รับการอนุมัติแล้ว</p>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
      {/* Quarterly Summary Row */}
      <div className="px-6 py-4 bg-indigo-600 border-b border-indigo-500 flex flex-wrap items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/50 rounded-lg border border-indigo-400">
            <TrendingUp className="text-white" size={20} />
          </div>
          <div>
            <p className="text-[10px] text-indigo-100 font-medium uppercase tracking-wider">ยอดสั่งเพิ่มรวมในงวดนี้</p>
            <p className="text-xl font-bold text-white">{quarterlySummary.totalDemand.toLocaleString()} <span className="text-xs font-normal opacity-80">หน่วย</span></p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/50 rounded-lg border border-emerald-400">
            <TrendingDown className="text-white" size={20} />
          </div>
          <div>
            <p className="text-[10px] text-emerald-100 font-medium uppercase tracking-wider">ยอดคืนของรวมในงวดนี้</p>
            <p className="text-xl font-bold text-white">{quarterlySummary.totalReturn.toLocaleString()} <span className="text-xs font-normal opacity-80">หน่วย</span></p>
          </div>
        </div>

        <div className="ml-auto hidden md:block">
          <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/10 backdrop-blur-sm">
            <p className="text-[10px] text-white/70 font-medium uppercase text-right">จำนวนรายการอุปกรณ์</p>
            <p className="text-lg font-bold text-white text-right">{Object.keys(plans).length} / {equipments.length}</p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-3">
            <FileSearch size={20} className="text-indigo-600" />
            <span>ตรวจสอบและแก้ไขแผน (PM Review & Edit)</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              job.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
              job.status === "REJECTED" ? "bg-rose-100 text-rose-700" :
              "bg-amber-100 text-amber-700"
            }`}>
              {job.status}
            </span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {job.status === "SUBMITTED" 
              ? "คุณสามารถแก้ไขยอดได้โดยตรง และระบบจะเก็บ Log การแก้ไขของคุณไว้" 
              : "ข้อมูลนี้ถูกบันทึกแล้ว ไม่สามารถแก้ไขได้ในขณะนี้"}
          </p>
        </div>

        <div className="flex-1 max-w-sm mx-4 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="ค้นหาอุปกรณ์เพื่อเพิ่ม/แก้ไข..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <select 
              className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value as any)}
            >
              <option value="ALL">แสดงทั้งหมด</option>
              <option value="DEMAND">เฉพาะรายการที่สั่งเพิ่ม (+)</option>
              <option value="RETURN">เฉพาะรายการที่มีการคืน (-)</option>
              <option value="CHANGED">เฉพาะรายการที่ถูกแก้ไข</option>
            </select>
          </div>
        </div>
        
        {job.status === "SUBMITTED" && (
          <div className="flex gap-3">
            {hasChanges && (
              <button 
                onClick={() => setSaveModalOpen(true)}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Save size={18} />
                Save Edits
              </button>
            )}
            <button 
              onClick={() => setRejectModalOpen(true)}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors"
            >
              <XCircle size={18} />
              Reject (ตีกลับ)
            </button>
            <button 
              onClick={() => setApproveModalOpen(true)}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-600/20"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
              Approve (อนุมัติ)
            </button>
          </div>
        )}
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        onConfirm={handleApprove}
        title="ยืนยันการอนุมัติแผนงาน"
        message={`คุณกำลังจะอนุมัติแผนงานประจำงวด ${job.cycle_id} ของโครงการ ${job.project_id}`}
        confirmText="ยืนยันการอนุมัติ"
        cancelText="ตรวจสอบอีกครั้ง"
        type="success"
        isLoading={saving}
      />

      <ConfirmModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onConfirm={handleSaveEdits}
        title="บันทึกการแก้ไขแผนงาน"
        message="คุณต้องการบันทึกการเปลี่ยนแปลงที่คุณได้แก้ไขในตารางนี้ใช่หรือไม่?"
        confirmText="บันทึกการแก้ไข"
        cancelText="ยกเลิก"
        type="info"
        isLoading={saving}
      />

      <ConfirmModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onConfirm={handleReject}
        title="ตีกลับแผนงาน (Reject)"
        message="กรุณาระบุเหตุผลในการตีกลับเพื่อให้หน้างานนำไปปรับปรุง"
        confirmText="ยืนยันการตีกลับ"
        cancelText="ยกเลิก"
        type="danger"
        isLoading={saving}
      >
        <textarea
          className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-rose-500 focus:outline-none text-sm min-h-[100px]"
          placeholder="ระบุเหตุผลที่นี่..."
          value={rejectNotes}
          onChange={(e) => setRejectNotes(e.target.value)}
        />
      </ConfirmModal>

      {/* Review Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-sm border-separate border-spacing-0">
          <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 z-30">
            <tr>
              <th className="px-2 py-3 border-r border-b border-slate-200 sticky left-0 bg-slate-50 z-40 text-center w-[40px] text-slate-400 font-black border-t-4 border-slate-300">#</th>
              <th className="px-4 py-3 border-r border-b border-slate-200 min-w-[150px] max-w-[250px] whitespace-normal sticky left-[40px] bg-slate-50 z-40 cursor-pointer hover:bg-slate-100 transition-colors shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] border-t-4 border-slate-300" onClick={() => requestSort("item")}>
                <div className="flex items-center text-xs">รายการอุปกรณ์ (Item) {getSortIcon("item")}</div>
              </th>
              <th className="px-2 py-4 border-r border-b border-slate-200 text-center min-w-[80px] bg-slate-100/50 text-slate-500 border-t-4 border-slate-300">
                <div className="flex flex-col items-center justify-center">
                  <PackageSearch size={14} />
                  <span className="text-[10px] uppercase font-black">ยอดตั้งต้น</span>
                  <span className="text-[8px] opacity-70">(Inventory)</span>
                </div>
              </th>
              {targetMonths.map((month, idx) => (
                <th key={idx} className="px-2 py-4 border-r border-b border-slate-200 text-center min-w-[80px] cursor-pointer hover:bg-slate-100 transition-colors bg-slate-50 border-t-4 border-slate-300" onClick={() => requestSort(month)}>
                  <div className="flex items-center justify-center">
                    {month}
                    {getSortIcon(month)}
                  </div>
                </th>
              ))}
              <th className="px-4 py-4 border-r border-b border-slate-200 text-center text-indigo-700 bg-indigo-50/50 border-t-4 border-indigo-500">
                <div className="flex flex-col items-center justify-center">
                  <TrendingUp size={14} />
                  <span className="text-[10px] uppercase font-black">รวมเพิ่ม</span>
                </div>
              </th>
              <th className="px-4 py-4 border-b border-slate-200 text-center text-emerald-700 bg-emerald-50/50 border-t-4 border-emerald-500">
                <div className="flex flex-col items-center justify-center">
                  <TrendingDown size={14} />
                  <span className="text-[10px] uppercase font-black">รวมคืน</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAndSortedEquipments.map((item, rowIndex) => {
               return (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="px-2 py-2 sticky left-0 bg-white border-r border-slate-100 z-10 text-center w-[40px] text-slate-400 font-mono text-[10px]">
                    {rowIndex + 1}
                  </td>
                  <td className="px-4 py-2 sticky left-[40px] bg-white border-r border-slate-100 z-10 whitespace-normal max-w-[250px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-800 leading-snug">{item.name}</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{item.item_code}</span>
                        <span className="text-[10px] text-slate-400">({item.unit})</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center bg-slate-50/50 border-r border-slate-100 font-mono text-xs text-slate-500">
                    {siteInventory[item.id] || 0}
                  </td>
                  {targetMonths.map((month, mIdx) => {
                    const qty = plans[item.id]?.[month] ?? 0;
                    
                    return (
                      <td key={mIdx} className="px-4 py-2 text-center">
                        <div className="flex flex-col items-center justify-center min-h-[54px] py-1">
                          <input
                            id={`pm-input-${rowIndex}-${mIdx}`}
                            type="number"
                            disabled={isReadOnly}
                            onFocus={(e) => e.target.select()}
                            onKeyDown={(e) => handleKeyDown(e, rowIndex, mIdx)}
                            className={`w-20 text-center py-1.5 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors disabled:opacity-75 disabled:bg-slate-50 ${
                              qty > 0 ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold" : "bg-white border-slate-200"
                            }`}
                            value={qty || 0}
                            onChange={(e) => handleQtyChange(item.id, month, e.target.value)}
                          />
                          <div className="h-4 flex items-center mt-1">
                            {(() => {
                              const prevQty = mIdx === 0 ? (prevPlans[item.id] ?? 0) : (plans[item.id]?.[targetMonths[mIdx-1]] ?? 0);
                              const currentQty = qty ?? 0;
                              if (currentQty < prevQty) {
                                return (
                                  <div className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100 font-bold flex items-center gap-0.5">
                                    <RefreshCw size={8} />
                                    คืน {prevQty - currentQty}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                  {/* Per-item Summary Columns */}
                  {(() => {
                    let itemDemand = 0;
                    let itemReturn = 0;
                    // Use siteInventory (Actual Stock) as the starting point
                    let current = siteInventory[item.id] || 0;
                    targetMonths.forEach(m => {
                      const p = plans[item.id]?.[m] ?? 0;
                      const d = p - current;
                      if (d > 0) itemDemand += d;
                      else if (d < 0) itemReturn += Math.abs(d);
                      current = p;
                    });
                    return (
                      <>
                        <td className="px-4 py-2 text-center font-bold text-indigo-700 bg-indigo-50/10 border-l border-slate-100">
                          {itemDemand > 0 ? `+${itemDemand}` : "-"}
                        </td>
                        <td className="px-4 py-2 text-center font-bold text-emerald-700 bg-emerald-50/10 border-l border-slate-100">
                          {itemReturn > 0 ? `-${itemReturn}` : "-"}
                        </td>
                      </>
                    );
                  })()}
                </tr>
               );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
