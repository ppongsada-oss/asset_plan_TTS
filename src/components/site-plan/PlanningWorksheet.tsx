"use client";

import { Save, Send, AlertCircle, Loader2, Search, ArrowUpDown, ChevronUp, ChevronDown, RefreshCw } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import ConfirmModal from "@/components/ui/ConfirmModal";

type PlanningWorksheetProps = {
  jobId: number;
  projectId: string;
  targetMonths: string[];
  isClosed: boolean;
  jobStatus: string;
  isUnlocked?: boolean;
};

type Equipment = {
  id: number;
  item_code: string;
  name: string;
  unit: string;
  remaining_stock: number;
};

export default function PlanningWorksheet({ jobId, projectId, targetMonths, isClosed, jobStatus, isUnlocked = false }: PlanningWorksheetProps) {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [plans, setPlans] = useState<Record<number, Record<string, number>>>({}); // equipment_id -> { month: qty }
  const [prevPlans, setPrevPlans] = useState<Record<number, number>>({}); // equipment_id -> prev_month_qty
  const [inventory, setInventory] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({ key: "", direction: null });
  
  // Modal states
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);

  useEffect(() => {
    // Fetch master equipments, current plans, and inventory
    Promise.all([
      fetch("/api/equipment").then(res => res.json()),
      fetch(`/api/site/plans?job_id=${jobId}`).then(res => res.json()),
      fetch(`/api/site/inventory?project_id=${projectId}`).then(res => res.json())
    ]).then(([eqRes, plansRes, invRes]) => {
      if (eqRes.success) setEquipments(eqRes.data);
      
      const planMap: Record<number, Record<string, number>> = {};
      if (plansRes.success) {
        plansRes.data.forEach((p: any) => {
          if (!planMap[p.equipment_id]) planMap[p.equipment_id] = {};
          planMap[p.equipment_id][p.month] = p.required_qty;
        });
      }
      setPlans(planMap);

      const invMap: Record<number, number> = {};
      if (invRes.success) {
        invRes.data.forEach((row: any) => invMap[row.equipment_id] = row.qty);
      }
      setInventory(invMap);

      if (plansRes.success && plansRes.previous_month_plans) {
        const pMap: Record<number, number> = {};
        plansRes.previous_month_plans.forEach((p: any) => pMap[p.equipment_id] = p.required_qty);
        setPrevPlans(pMap);
      }

      setLoading(false);
    }).catch(console.error);
  }, [jobId, projectId]);
  
  const filteredAndSortedEquipments = useMemo(() => {
    let result = [...equipments];

    // Filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(e => 
        e.item_code.toLowerCase().includes(lower) || 
        e.name.toLowerCase().includes(lower)
      );
    }

    // Sort
    if (sortConfig.key && sortConfig.direction) {
      result.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        if (sortConfig.key === "item") {
          aVal = a.item_code + a.name;
          bVal = b.item_code + b.name;
        } else if (sortConfig.key === "center") {
          aVal = a.remaining_stock;
          bVal = b.remaining_stock;
        } else if (sortConfig.key === "stock") {
          aVal = inventory[a.id] || 0;
          bVal = inventory[b.id] || 0;
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
  }, [equipments, searchTerm, sortConfig, inventory, plans]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'desc'; // default to desc for stock
    if (key === "item") direction = "asc"; // default to asc for names

    if (sortConfig.key === key && sortConfig.direction === direction) {
      direction = direction === "asc" ? "desc" : "asc";
    } else if (sortConfig.key === key) {
      // Third click resets
      direction = sortConfig.direction === "asc" ? "desc" : null;
      if (sortConfig.direction === (key === "item" ? "desc" : "asc")) direction = null;
    }
    
    // Simplified toggle: asc -> desc -> reset
    if (sortConfig.key === key) {
        if (sortConfig.direction === 'asc') setSortConfig({ key, direction: 'desc' });
        else if (sortConfig.direction === 'desc') setSortConfig({ key: "", direction: null });
        else setSortConfig({ key, direction: 'asc' });
    } else {
        setSortConfig({ key, direction: key === "item" ? 'asc' : 'desc' });
    }
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="ml-1 opacity-20" />;
    if (sortConfig.direction === "asc") return <ChevronUp size={14} className="ml-1 text-indigo-600" />;
    return <ChevronDown size={14} className="ml-1 text-indigo-600" />;
  };

  const handleQtyChange = (equipmentId: number, month: string, val: string) => {
    if (isClosed) return;
    
    const sanitized = val.replace(/[^0-9]/g, '');
    const num = val === "" ? 0 : (parseInt(sanitized) || 0);
    
    setPlans(prev => {
      const currentEqPlans = { ...(prev[equipmentId] || {}) };
      currentEqPlans[month] = num;

      return {
        ...prev,
        [equipmentId]: currentEqPlans
      };
    });
  };

  const runAutoFill = (equipmentId: number, month: string) => {
    const val = plans[equipmentId]?.[month];
    if (val === undefined || val === null) return;

    setPlans(prev => {
      const currentEqPlans = { ...(prev[equipmentId] || {}) };
      const monthIndex = targetMonths.indexOf(month);
      if (monthIndex !== -1) {
        for (let i = monthIndex + 1; i < targetMonths.length; i++) {
          const nextMonth = targetMonths[i];
          if (currentEqPlans[nextMonth] === undefined || currentEqPlans[nextMonth] === null) {
            currentEqPlans[nextMonth] = val;
          }
        }
      }
      return { ...prev, [equipmentId]: currentEqPlans };
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number, equipmentId: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      
      // If it's the first month and the value is empty/blank, fill from previous month (or default 0)
      const currentVal = plans[equipmentId]?.[targetMonths[0]];
      if (colIndex === 0 && (currentVal === undefined || currentVal === null)) {
        const prevVal = prevPlans[equipmentId] ?? 0;
        // Directly update and trigger auto-fill here
        setPlans(prev => {
          const currentEqPlans = { ...(prev[equipmentId] || {}) };
          currentEqPlans[targetMonths[0]] = prevVal;
          for (let i = 1; i < targetMonths.length; i++) {
            const nextMonth = targetMonths[i];
            if (currentEqPlans[nextMonth] === undefined || currentEqPlans[nextMonth] === null) {
              currentEqPlans[nextMonth] = prevVal;
            }
          }
          return { ...prev, [equipmentId]: currentEqPlans };
        });
      } else {
        // Just trigger auto-fill for the current field if any
        runAutoFill(equipmentId, targetMonths[colIndex]);
      }

      const nextRowIndex = rowIndex + 1;
      const nextInput = document.getElementById(`input-${nextRowIndex}-0`);
      if (nextInput) {
        (nextInput as HTMLInputElement).focus();
      }
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    
    // Save Plans
    const plansArray: any[] = [];
    Object.entries(plans).forEach(([equipmentId, monthData]) => {
      Object.entries(monthData).forEach(([month, qty]) => {
        if (qty !== null && qty !== undefined) {
          plansArray.push({
            equipment_id: parseInt(equipmentId),
            month,
            required_qty: qty
          });
        }
      });
    });

    try {
      await fetch("/api/site/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId, project_id: projectId, plans: plansArray })
      });
      setSaveModalOpen(false);
      alert("บันทึกข้อมูลเรียบร้อยแล้ว");
    } catch (e) {
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitJob = async () => {
    setSaving(true);
    try {
      // Auto-save before submitting
      const plansArray: any[] = [];
      Object.entries(plans).forEach(([equipmentId, monthData]) => {
        Object.entries(monthData).forEach(([month, qty]) => {
          if (qty !== null && qty !== undefined) {
            plansArray.push({
              equipment_id: parseInt(equipmentId),
              month,
              required_qty: qty
            });
          }
        });
      });

      await fetch("/api/site/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId, project_id: projectId, plans: plansArray })
      });

      // Submit
      await fetch(`/api/site/jobs/${jobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SUBMITTED" })
      });
      
      setSubmitModalOpen(false);
      alert("ส่งแผนสำเร็จ");
      window.location.reload();
    } catch (e) {
      alert("Error submitting job");
    } finally {
      setSaving(false);
    }
  };

  const isLocked = isClosed || (jobStatus === "SUBMITTED" && !isUnlocked) || (jobStatus === "APPROVED" && !isUnlocked);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mt-6 p-12 flex justify-center">
        <Loader2 className="animate-spin text-slate-400" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            แบบฟอร์มร่างแผนอุปกรณ์ (Equipment Draft Plan)
          </h2>
        </div>

        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="ค้นหาด้วยรหัสหรือชื่ออุปกรณ์..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setSaveModalOpen(true)} 
            disabled={saving || isLocked} 
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Draft (บันทึก)
          </button>
          <button 
            onClick={() => setSubmitModalOpen(true)}
            disabled={saving || isLocked} 
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors shadow-sm disabled:opacity-50 disabled:bg-slate-400 disabled:cursor-not-allowed"
          >
            <Send size={16} />
            Submit
          </button>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onConfirm={handleSaveDraft}
        title="บันทึกร่างแผนงาน"
        message="คุณต้องการบันทึกร่างแผนงานในปัจจุบันเพื่อกลับมาแก้ไขต่อภายหลังใช่หรือไม่?"
        confirmText="ยืนยันการบันทึก"
        cancelText="ยกเลิก"
        type="info"
        isLoading={saving}
      />

      <ConfirmModal
        isOpen={submitModalOpen}
        onClose={() => setSubmitModalOpen(false)}
        onConfirm={handleSubmitJob}
        title="ส่งแผนงานเพื่อขออนุมัติ"
        message="เมื่อส่งแผนงานแล้ว คุณจะไม่สามารถแก้ไขได้จนกว่าจะได้รับการพิจารณาจาก PM คุณต้องการยืนยันการส่งใช่หรือไม่?"
        confirmText="ยืนยันการส่งแผน"
        cancelText="กลับไปแก้ไข"
        type="success"
        isLoading={saving}
      />

      {isUnlocked && (
        <div className="bg-emerald-50 border-b border-emerald-100 p-3 px-6 flex items-start sm:items-center gap-3 text-sm text-emerald-800">
          <AlertCircle size={18} className="shrink-0 mt-0.5 sm:mt-0 text-emerald-600" />
          <p>
            🔓 <strong>ปลดล็อคชั่วคราว:</strong> Store Center ได้เปิดสิทธิ์การเข้าถึงให้คุณเป็นกรณีพิเศษ สามารถแก้ไขข้อมูลและส่งแผนงานได้ตามปกติ
          </p>
        </div>
      )}

      {isLocked && (
        <div className="bg-amber-50 border-b border-amber-100 p-3 px-6 flex items-start sm:items-center gap-3 text-sm text-amber-800">
          <AlertCircle size={18} className="shrink-0 mt-0.5 sm:mt-0 text-amber-600" />
          <p>
            {isClosed ? "งวดงานนี้ปิดรับแล้ว " : "ใบงานนี้ได้ส่งไปแล้ว "}
            ไม่สามารถแก้ไขข้อมูลได้ หากต้องการแก้ไขโปรดติดต่อ Store Center
          </p>
        </div>
      )}

      <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
        <table className="w-full text-left text-sm border-separate border-spacing-0">
          <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 z-30">
            <tr>
              <th className="px-2 py-3 border-r border-b border-slate-200 sticky left-0 bg-slate-50 z-40 text-center w-[40px] text-slate-400 font-black border-t-4 border-slate-300">#</th>
              <th 
                className="px-4 py-3 border-r border-b border-slate-200 min-w-[150px] max-w-[250px] whitespace-normal sticky left-[40px] bg-slate-50 z-40 cursor-pointer hover:bg-slate-100 transition-colors shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] border-t-4 border-slate-300"
                onClick={() => requestSort("item")}
              >
                <div className="flex items-center text-xs">
                  รายการอุปกรณ์ (Item)
                  {getSortIcon("item")}
                </div>
              </th>
              <th 
                className="px-2 py-4 border-r border-b border-slate-200 text-center min-w-[80px] bg-blue-50/50 text-blue-800 border-t-4 border-blue-500 cursor-pointer hover:bg-blue-100 transition-colors"
                onClick={() => requestSort("center")}
              >
                <div className="flex items-center justify-center">
                  ยอดคลังกลาง {getSortIcon("center")}
                </div>
              </th>
              <th 
                className="px-2 py-4 border-r border-b border-slate-200 text-center min-w-[80px] bg-emerald-50/50 text-emerald-800 border-t-4 border-emerald-500 cursor-pointer hover:bg-emerald-100 transition-colors"
                onClick={() => requestSort("stock")}
              >
                <div className="flex items-center justify-center">
                  ยอดมีอยู่ {getSortIcon("stock")}
                </div>
              </th>
              {targetMonths.map((month, idx) => (
                <th 
                  key={idx} 
                  className="px-2 py-4 border-r border-b border-slate-200 text-center min-w-[80px] bg-slate-50 border-t-4 border-slate-300 cursor-pointer hover:bg-slate-100 transition-colors"
                  onClick={() => requestSort(month)}
                >
                  <div className="flex items-center justify-center">
                    {month}
                    {getSortIcon(month)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredAndSortedEquipments.length === 0 ? (
              <tr>
                <td colSpan={targetMonths.length + 3} className="px-6 py-12 text-center text-slate-400">
                  ไม่พบรายการที่ค้นหา
                </td>
              </tr>
            ) : filteredAndSortedEquipments.map((item, rowIndex) => (
              <tr key={item.id} className="hover:bg-slate-50/50 group">
                <td className="px-2 py-2 sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-100 z-10 text-center w-[40px] text-slate-400 font-mono text-[10px]">
                  {rowIndex + 1}
                </td>
                <td className="px-4 py-2 sticky left-[40px] bg-white group-hover:bg-slate-50/50 border-r border-slate-100 z-10 whitespace-normal max-w-[250px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-800 leading-snug">{item.name}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{item.item_code}</span>
                      <span className="text-[10px] text-slate-400">({item.unit})</span>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2 text-center bg-blue-50/10 font-bold text-blue-700 border-r border-slate-100">
                  {item.remaining_stock.toLocaleString()}
                </td>
                <td className="px-4 py-2 text-center bg-emerald-50/20 font-bold text-emerald-700 border-r border-slate-100">
                  {(inventory[item.id] || 0).toLocaleString()}
                </td>
                {targetMonths.map((month, mIdx) => {
                  const qty = plans[item.id]?.[month];
                  return (
                    <td key={mIdx} className="px-4 py-2 text-center">
                      <div className="flex flex-col items-center justify-center min-h-[54px] py-1">
                        <input
                          id={`input-${rowIndex}-${mIdx}`}
                          type="number"
                          min="0"
                          disabled={isLocked}
                          onFocus={(e) => e.target.select()}
                          onBlur={() => runAutoFill(item.id, month)}
                          onKeyDown={(e) => handleKeyDown(e, rowIndex, mIdx, item.id)}
                          className={`w-20 text-center py-1.5 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors disabled:opacity-75 disabled:bg-slate-100 ${
                            qty !== null && qty !== undefined && qty > 0 
                              ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold" 
                              : qty === 0 
                                ? "bg-slate-50 border-slate-200 text-slate-900" // 0 is neutral
                                : "bg-white border-slate-200 text-slate-400 placeholder:text-slate-300" // blank
                          }`}
                          value={qty === null || qty === undefined ? "" : qty}
                          onChange={(e) => handleQtyChange(item.id, month, e.target.value)}
                          placeholder={mIdx === 0 ? (prevPlans[item.id] ?? 0).toString() : ""}
                        />
                        <div className="h-4 flex items-center mt-1">
                          {(() => {
                            const prevQty = mIdx === 0 ? (prevPlans[item.id] ?? 0) : (plans[item.id]?.[targetMonths[mIdx-1]] ?? 0);
                            const currentQty = qty ?? 0;
                            if (currentQty < prevQty) {
                              return (
                                <div className="text-[9px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100 font-bold flex items-center gap-0.5 animate-in fade-in zoom-in duration-300">
                                  <RefreshCw size={8} className="animate-spin-slow" />
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
