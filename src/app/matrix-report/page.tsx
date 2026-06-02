"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Filter, Loader2, Table, ChevronDown, CheckCircle2, Info, ArrowUpDown, ChevronUp, ChevronDown as ChevronDownIcon, Download } from "lucide-react";
import * as XLSX from "xlsx";
import useSWR from "swr";

const fetcher = (url: string): Promise<any> => fetch(url).then(res => res.json());

export default function MatrixReport() {
  const [data, setData] = useState<any[]>([]);
  const [projects, setProjects] = useState<{ sites: string[], warehouses: string[] }>({ sites: [], warehouses: [] });
  const [projectMapping, setProjectMapping] = useState<any[]>([]);
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState(false);
  
  // Filters
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [showArchived, setShowArchived] = useState(false);

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' | null }>({ key: "", direction: null });

  const getMatrixUrl = () => {
    let url = "/api/reports/matrix";
    const params = new URLSearchParams();
    if (selectedCycleId) params.append("cycleId", selectedCycleId.toString());
    if (selectedMonths.length > 0) params.append("months", selectedMonths.join(","));
    if (showArchived) params.append("showArchived", "true");
    if (params.toString()) url += `?${params.toString()}`;
    return url;
  };

  const { data: matrixResponse } = useSWR<{
    success: boolean;
    matrix: any[];
    projects: { sites: string[]; warehouses: string[] };
    projectMapping: any[];
    cycles: any[];
    activeCycleId?: number;
    activeMonths?: string[];
  }>(getMatrixUrl(), fetcher);

  useEffect(() => {
    if (matrixResponse?.success) {
      setData(matrixResponse.matrix);
      setProjects(matrixResponse.projects);
      setProjectMapping(matrixResponse.projectMapping || []);
      setCycles(matrixResponse.cycles || []);
      
      if (!selectedCycleId && matrixResponse.activeCycleId) {
        setSelectedCycleId(matrixResponse.activeCycleId);
      }
      if (selectedMonths.length === 0 && matrixResponse.activeMonths && matrixResponse.activeMonths.length > 0) {
        setSelectedMonths(matrixResponse.activeMonths);
      }
    }
  }, [matrixResponse]);

  useEffect(() => {
    if (matrixResponse) {
      setLoading(false);
    } else {
      setLoading(true);
    }
  }, [matrixResponse]);

  const projectMap = useMemo(() => {
    const map: Record<string, string> = {};
    projectMapping.forEach(p => map[p.id] = p.name);
    return map;
  }, [projectMapping]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' | null = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key || !sortConfig.direction) return <ArrowUpDown size={12} className="ml-1 opacity-20" />;
    if (sortConfig.direction === 'asc') return <ChevronUp size={12} className="ml-1 text-indigo-600" />;
    return <ChevronDownIcon size={12} className="ml-1 text-indigo-600" />;
  };

  const processedData = useMemo(() => {
    let result = filterAction ? data.filter(d => d.pendingDemand > 0 || d.totalReturns > 0) : [...data];

    if (sortConfig.key && sortConfig.direction) {
      result.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (sortConfig.key) {
          case 'name': aVal = a.name; bVal = b.name; break;
          case 'demand': aVal = a.totalDemand; bVal = b.totalDemand; break;
          case 'pending': aVal = a.pendingDemand; bVal = b.pendingDemand; break;
          case 'returns': aVal = a.totalReturns; bVal = b.totalReturns; break;
          case 'dispatch': aVal = a.actions.dispatch; bVal = b.actions.dispatch; break;
          case 'circulate': aVal = a.actions.circulate; bVal = b.actions.circulate; break;
          case 'substitute': aVal = a.actions.substitute; bVal = b.actions.substitute; break;
          case 'buy': aVal = a.actions.buy; bVal = b.actions.buy; break;
          case 'rent': aVal = a.actions.rent; bVal = b.actions.rent; break;
          case 'receive': aVal = a.actions.receive; bVal = b.actions.receive; break;
          case 'reject': aVal = a.actions.reject; bVal = b.actions.reject; break;
          case 'receipt': aVal = a.pendingReceipt; bVal = b.pendingReceipt; break;
          default: aVal = 0; bVal = 0;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Default Sort: Priority items with pending actions at top
      result.sort((a, b) => {
        const aPriority = (a.pendingDemand || 0) + (a.pendingReceipt || 0);
        const bPriority = (b.pendingDemand || 0) + (b.pendingReceipt || 0);
        if (bPriority !== aPriority) return bPriority - aPriority;
        return a.name.localeCompare(b.name); // Secondary sort by name
      });
    }
    return result;
  }, [data, filterAction, sortConfig]);

  const activeCycle = useMemo(() => 
    cycles.find(c => c.id === selectedCycleId), 
    [cycles, selectedCycleId]
  );

  const availableMonths = useMemo(() => {
    if (!activeCycle) return [];
    try {
      return JSON.parse(activeCycle.target_months);
    } catch {
      return [];
    }
  }, [activeCycle]);

  const toggleMonth = (month: string) => {
    setSelectedMonths(prev => 
      prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
    );
  };

  const handleExportAll = () => {
    const exportData = processedData.map(row => {
      const obj: any = {
        'รหัสอุปกรณ์': row.code,
        'รายการอุปกรณ์': row.name,
        'Total Demand': row.totalDemand,
        'เบิกจ่าย': row.actions.dispatch,
        'หมุนเวียน': row.actions.circulate,
        'สลับสเปก': row.actions.substitute,
        'ซื้อ': row.actions.buy,
        'เช่า': row.actions.rent,
        'ค้างส่ง (D)': row.pendingDemand,
        'ส่งคืนได้ (S)': row.totalReturns,
        'รับคืนแล้ว': row.actions.receive,
        'ปฏิเสธการคืน': row.actions.reject,
        'ค้างรับ (R)': row.pendingReceipt,
      };
      
      projects.sites.forEach(p => {
        obj[`Site: ${p}`] = row.sites[p] || 0;
      });
      projects.warehouses.forEach(p => {
        obj[`WH: ${p}`] = row.warehouses[p] || 0;
      });
      
      return obj;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Matrix Report");
    XLSX.writeFile(wb, `Matrix_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportProcurement = () => {
    const exportData: any[] = [];
    
    processedData.forEach(row => {
      // Process BUY
      row.details.buy.forEach((item: any) => {
        Object.entries(item.breakdown).forEach(([month, qty]: [string, any]) => {
          if (qty > 0) {
            exportData.push({
              'ประเภทการจัดการ': 'จัดซื้อ (BUY)',
              'รหัสอุปกรณ์': row.code,
              'รายการอุปกรณ์': row.name,
              'หน่วยงาน': projectMap[item.project] || item.project,
              'เดือนที่ใช้งาน': month,
              'จำนวน': qty
            });
          }
        });
      });
      
      // Process RENT
      row.details.rent.forEach((item: any) => {
        Object.entries(item.breakdown).forEach(([month, qty]: [string, any]) => {
          if (qty > 0) {
            exportData.push({
              'ประเภทการจัดการ': 'เช่า (RENT)',
              'รหัสอุปกรณ์': row.code,
              'รายการอุปกรณ์': row.name,
              'หน่วยงาน': projectMap[item.project] || item.project,
              'เดือนที่ใช้งาน': month,
              'จำนวน': qty
            });
          }
        });
      });
    });

    if (exportData.length === 0) {
      alert("ไม่มีรายการจัดซื้อหรือจัดเช่าในขณะนี้");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Procurement List");
    XLSX.writeFile(wb, `Procurement_Plan_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const BreakdownTooltip = ({ items, title, side = 'right' }: { items: any[], title: string, side?: 'left' | 'right' }) => {
    if (!items || items.length === 0) return null;

    // Sort: Pending > 0 at top, 0 at bottom
    const sortedItems = [...items].sort((a, b) => (b.qty || 0) - (a.qty || 0));

    const positionClass = side === 'right' 
      ? 'left-full top-0 ml-0' 
      : 'right-full top-0 mr-0';

    return (
      <div className={`absolute ${positionClass} hidden group-hover/cell:block z-[100] pointer-events-auto pt-0 px-1`}>
        <div className={`w-3 h-3 bg-slate-900 rotate-45 absolute top-4 border-white/20 ${side === 'right' ? '-left-1.5 border-l border-b' : '-right-1.5 border-r border-t'}`} />
        <div className="bg-slate-900 text-white text-[10px] p-3 rounded-lg shadow-2xl min-w-[240px] max-w-[320px] whitespace-normal border border-white/20 text-left relative">
          <div className="font-bold border-b border-white/10 pb-2 mb-2 text-center text-indigo-400 uppercase tracking-widest">{title}</div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
            {sortedItems.map((item, idx) => {
              const isHandled = item.qty === 0;
              return (
                <div 
                  key={idx} 
                  className={`flex justify-between items-start gap-4 leading-tight border mb-1 p-2 rounded-lg transition-all ${isHandled ? 'bg-slate-800/80 border-white/5 opacity-30' : 'bg-white/5 border-white/10'}`}
                >
                  <div className="flex flex-col flex-1">
                    <span className={`font-semibold ${isHandled ? 'text-slate-500' : 'text-slate-100'}`}>
                      {projectMap[item.project] || item.project}
                    </span>
                    {item.grossRequired !== undefined && item.expectedReturn !== undefined && (
                      <div className={`text-[9px] mt-1 font-medium bg-white/5 px-2 py-0.5 rounded border border-white/5 ${isHandled ? 'text-slate-400 border-white/5' : 'text-indigo-300'}`}>
                        ความต้องการ: {item.grossRequired} | ยอดต้องคืน: {item.expectedReturn} | สุทธิ: {item.qty}
                      </div>
                    )}
                    {item.breakdown && Object.keys(item.breakdown).length > 0 && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[9px]">
                        {Object.entries(item.breakdown).map(([m, q]: [string, any]) => {
                          const isHighlighted = m === 'Pending' && !isHandled;
                          return (
                            <span key={m} className={`px-1.5 py-0.5 rounded ${isHighlighted ? 'bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30' : 'text-slate-400 opacity-60'}`}>
                              {m}: {q}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`font-mono text-xs font-black shrink-0 ${!isHandled ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {item.qty > 0 ? `+${item.qty}` : item.qty}
                    </span>
                    {!isHandled && <span className="text-[7px] text-emerald-500/70 font-bold uppercase tracking-tighter italic">Waiting</span>}
                    {isHandled && <span className="text-[7px] text-slate-500 font-bold uppercase tracking-tighter">Done</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const totalCols = (projects.sites.length || 0) + (projects.warehouses.length || 0) + 13;

  return (
    <div className="py-6 px-[5%] w-full h-[100vh] flex flex-col overflow-hidden bg-slate-50/30">
      <div className="mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Table className="text-indigo-600" />
            Matrix Report (รายงานภาพรวมอุปกรณ์)
          </h1>
          <p className="text-slate-500 text-sm mt-1">ตารางสรุปยอดคงเหลือและกระจายอุปกรณ์ทุกโครงการ</p>
          
          <div className="mt-4 flex flex-wrap gap-4 items-center">
            {/* Cycle Selector */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Planning Cycle</label>
              <div className="relative">
                <select 
                  value={selectedCycleId || ""}
                  onChange={(e) => {
                    const id = parseInt(e.target.value);
                    setSelectedCycleId(id);
                    const cycle = cycles.find(c => c.id === id);
                    if (cycle) {
                      try {
                        setSelectedMonths(JSON.parse(cycle.target_months));
                      } catch {
                        setSelectedMonths([]);
                      }
                    }
                  }}
                  className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 pr-10 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all min-w-[180px]"
                >
                  {cycles.map(c => (
                    <option key={c.id} value={c.id}>{c.cycle_number}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Month Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Months</label>
              <div className="flex flex-wrap gap-2">
                {availableMonths.map((m: string) => (
                  <button
                    key={m}
                    onClick={() => toggleMonth(m)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      selectedMonths.includes(m)
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Archived Toggle */}
            <div className="flex items-center gap-2 self-end mb-1">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  showArchived 
                    ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-500'
                }`}
              >
                {showArchived ? 'Archive: Shown' : 'Archive: Hidden'}
                <div className={`w-8 h-4 rounded-full relative transition-colors ${showArchived ? 'bg-amber-400' : 'bg-slate-200'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${showArchived ? 'right-0.5' : 'left-0.5'}`} />
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 items-end">
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm">
              <Download size={16} />
              Export ข้อมูล
              <ChevronDown size={14} />
            </button>
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden hidden group-hover:block z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">เลือกรูปแบบการ Export</div>
              <button 
                onClick={handleExportAll}
                className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-indigo-50 border-b border-slate-100 transition-colors flex flex-col gap-0.5"
              >
                <span className="font-bold text-indigo-600">1. Export ทั้งหมด</span>
                <span className="text-[10px] text-slate-500 leading-tight">ดึงข้อมูลสรุปทุกโครงการและคลังสินค้า</span>
              </button>
              <button 
                onClick={handleExportProcurement}
                className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-emerald-50 transition-colors flex flex-col gap-0.5"
              >
                <span className="font-bold text-emerald-600">2. Export รายการจัดซื้อ/เช่า</span>
                <span className="text-[10px] text-slate-500 leading-tight">ดึงข้อมูลเฉพาะรายการที่ต้องจัดหาแยกตามเดือน</span>
              </button>
            </div>
          </div>

          <button 
            onClick={() => setFilterAction(!filterAction)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
              filterAction ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter size={16} />
            {filterAction ? 'แสดงทั้งหมด' : 'เฉพาะ Action Required'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden flex-1 flex flex-col min-h-0 relative z-10">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-sm text-left whitespace-nowrap border-separate border-spacing-0 table-auto">
            <thead className="bg-slate-50">
              <tr className="z-40">
                <th rowSpan={2} className="w-[50px] min-w-[50px] max-w-[50px] p-0 font-black sticky top-0 left-0 bg-slate-50 z-[100] border-b border-slate-200 border-t-4 border-slate-400 text-center text-slate-400 uppercase tracking-tighter shadow-[1px_0_0_0_#e2e8f0]">
                  <div className="w-[50px] py-3">#</div>
                </th>




                <th rowSpan={2} 
                  onClick={() => requestSort('name')}
                  className="px-6 py-3 font-black sticky top-0 left-[49px] bg-slate-50 z-[100] border-b border-slate-200 border-t-4 border-slate-400 min-w-[350px] cursor-pointer hover:bg-slate-100 transition-colors shadow-[1px_0_0_0_#e2e8f0]"
                >

                  <div className="flex items-center justify-between">
                    <span className="text-slate-800 uppercase tracking-tight">รายการอุปกรณ์</span>
                    {getSortIcon('name')}
                  </div>
                </th>



                <th colSpan={projects.sites.length} className="px-4 py-3 h-[40px] font-black text-center border-r border-slate-200 bg-indigo-50/50 text-[10px] uppercase tracking-[0.2em] text-indigo-700 border-t-4 border-indigo-600 sticky top-0 z-[50]">
                  แผนงานโครงการ (Sites)
                </th>
                <th colSpan={projects.warehouses.length} className="px-4 py-3 h-[40px] font-black text-center border-r border-slate-200 bg-emerald-50/50 text-[10px] uppercase tracking-[0.2em] text-emerald-700 border-t-4 border-emerald-600 sticky top-0 z-[50]">
                  สต็อกคลังกลาง (Warehouses)
                </th>
                <th rowSpan={2} 
                  onClick={() => requestSort('demand')}
                  className="px-4 py-3 font-black text-center border-r border-b border-slate-200 bg-slate-100 text-indigo-900 border-t-4 border-indigo-500 cursor-pointer hover:bg-indigo-100 transition-colors min-w-[100px] sticky top-0 z-[50]"
                >


                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] uppercase tracking-widest">Demand</span>
                    <div className="flex items-center text-indigo-700">{getSortIcon('demand')} <span className="text-[10px] font-bold">(รวม)</span></div>
                  </div>
                </th>
                <th colSpan={5} className="px-4 py-3 h-[40px] font-black text-center border-r border-slate-200 bg-amber-50/50 text-[10px] uppercase tracking-[0.2em] text-amber-700 border-t-4 border-amber-600 sticky top-0 z-[50]">
                  การจัดส่ง (Supply)
                </th>
                <th rowSpan={2} 
                  onClick={() => requestSort('pending')}
                  className="px-4 py-3 font-black text-center border-r border-b border-slate-200 bg-rose-50 text-rose-700 border-t-4 border-rose-500 cursor-pointer hover:bg-rose-100 transition-colors min-w-[100px] sticky top-0 z-[50]"
                >


                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs uppercase tracking-tighter">ค้างส่ง (D)</span>
                    <div className="flex items-center">{getSortIcon('pending')} <span className="text-[9px] font-medium opacity-70">(Pending)</span></div>
                  </div>
                </th>
                <th colSpan={3} className="px-4 py-3 h-[40px] font-black text-center border-r border-slate-200 bg-emerald-50/50 text-[10px] uppercase tracking-[0.2em] text-emerald-700 border-t-4 border-emerald-600 sticky top-0 z-[50]">
                  การรับคืน (Return)
                </th>
                <th rowSpan={2} 
                  onClick={() => requestSort('receipt')}
                  className="px-4 py-3 font-black text-center text-blue-700 bg-blue-50 border-t-4 border-blue-500 cursor-pointer hover:bg-blue-100 transition-colors min-w-[100px] sticky top-0 z-[50] border-b border-slate-200"
                >


                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs uppercase tracking-tighter">ค้างรับ</span>
                    <div className="flex items-center">{getSortIcon('receipt')} <span className="text-[9px] font-medium opacity-70">(Receipt)</span></div>
                  </div>
                </th>
              </tr>
              <tr>
                {projects.sites.map(p => (
                  <th key={p} className="px-2 py-3 font-bold text-center border-r border-b border-slate-200 min-w-[80px] relative group/cell bg-indigo-50 text-indigo-900 text-[11px] sticky top-[40px] z-[40]">


                    {p}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/cell:block z-50">
                      <div className="bg-slate-800 text-white text-[10px] px-2 py-1.5 rounded shadow-xl border border-slate-700 min-w-[120px] max-w-[200px] whitespace-normal leading-tight font-normal">
                        {projectMap[p] || p}
                      </div>
                      <div className="w-1.5 h-1.5 bg-slate-800 rotate-45 absolute -bottom-0.5 left-1/2 -translate-x-1/2 border-r border-b border-slate-700" />
                    </div>
                  </th>
                ))}
                {projects.warehouses.map(p => (
                  <th key={p} className="px-2 py-3 font-bold text-center border-r border-b border-slate-200 min-w-[80px] relative group/cell bg-emerald-50 text-[11px] sticky top-[40px] z-[40]">


                    {p}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/cell:block z-50">
                      <div className="bg-slate-800 text-white text-[10px] px-2 py-1.5 rounded shadow-xl border border-slate-700 min-w-[120px] max-w-[200px] whitespace-normal leading-tight font-normal">
                        {projectMap[p] || p}
                      </div>
                      <div className="w-1.5 h-1.5 bg-slate-800 rotate-45 absolute -bottom-0.5 left-1/2 -translate-x-1/2 border-r border-b border-slate-700" />
                    </div>
                  </th>
                ))}

                <th onClick={() => requestSort('dispatch')} className="px-2 py-3 font-bold text-center border-r border-b border-slate-200 text-amber-600 text-[10px] cursor-pointer hover:bg-amber-100 min-w-[80px] sticky top-[40px] z-[40] bg-slate-50">
                  <div className="flex items-center justify-center">เบิกจ่าย {getSortIcon('dispatch')}</div>
                </th>
                <th onClick={() => requestSort('circulate')} className="px-2 py-3 font-bold text-center border-r border-b border-slate-200 text-amber-600 text-[10px] cursor-pointer hover:bg-amber-100 min-w-[80px] sticky top-[40px] z-[40] bg-slate-50">
                  <div className="flex items-center justify-center">หมุน {getSortIcon('circulate')}</div>
                </th>
                <th onClick={() => requestSort('substitute')} className="px-2 py-3 font-bold text-center border-r border-b border-slate-200 text-amber-600 text-[10px] cursor-pointer hover:bg-amber-100 min-w-[80px] sticky top-[40px] z-[40] bg-slate-50">
                  <div className="flex items-center justify-center">สลับ {getSortIcon('substitute')}</div>
                </th>
                <th onClick={() => requestSort('buy')} className="px-2 py-3 font-bold text-center border-r border-b border-slate-200 text-amber-600 text-[10px] cursor-pointer hover:bg-amber-100 min-w-[80px] sticky top-[40px] z-[40] bg-slate-50">
                  <div className="flex items-center justify-center">ซื้อ {getSortIcon('buy')}</div>
                </th>


                <th onClick={() => requestSort('rent')} className="px-2 py-3 font-bold text-center border-r border-b border-slate-200 text-amber-600 text-[10px] cursor-pointer hover:bg-amber-100/50 min-w-[80px] sticky top-[40px] z-[40] bg-slate-50">
                  <div className="flex items-center justify-center">เช่า {getSortIcon('rent')}</div>
                </th>
                
                <th onClick={() => requestSort('returns')} className="px-2 py-3 font-bold text-center border-r border-b border-slate-200 text-indigo-700 bg-indigo-50/50 text-[10px] cursor-pointer hover:bg-indigo-100 min-w-[80px] sticky top-[40px] z-[40] bg-indigo-50/50">
                  <div className="flex items-center justify-center">ส่งคืนได้ (S) {getSortIcon('returns')}</div>
                </th>
                <th onClick={() => requestSort('receive')} className="px-2 py-3 font-bold text-center border-r border-b border-slate-200 text-emerald-700 bg-emerald-50/50 text-[10px] cursor-pointer hover:bg-emerald-100 min-w-[80px] sticky top-[40px] z-[40] bg-emerald-50/50">
                  <div className="flex items-center justify-center">ยอดคืน {getSortIcon('receive')}</div>
                </th>
                <th onClick={() => requestSort('reject')} className="px-2 py-3 font-bold text-center border-r border-b border-slate-200 text-rose-700 bg-rose-50/50 text-[10px] cursor-pointer hover:bg-rose-100 min-w-[80px] sticky top-[40px] z-[40] bg-rose-50/50">
                  <div className="flex items-center justify-center">ปฏิเสธ {getSortIcon('reject')}</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={totalCols} className="p-16 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500 mb-2" /><span className="text-slate-400 text-xs">กำลังวิเคราะห์ข้อมูล Matrix...</span></td></tr>
              ) : processedData.length === 0 ? (
                <tr><td colSpan={totalCols} className="p-16 text-center text-slate-400">ไม่มีข้อมูลที่ตรงตามเงื่อนไขการกรอง</td></tr>
              ) : processedData.map((row, idx) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group/row">
                  <td className="w-[50px] min-w-[50px] max-w-[50px] p-0 sticky left-0 bg-white border-b border-slate-100 z-[30] text-center text-slate-400 text-xs group-hover/row:bg-slate-50/80 shadow-[1px_0_0_0_#f1f5f9]">
                    <div className="w-[50px] py-3">{idx + 1}</div>
                  </td>
                  <td className="px-6 py-3 sticky left-[49px] bg-white border-b border-slate-100 z-[30] group-hover/row:bg-slate-50/80 shadow-[1px_0_0_0_#f1f5f9,4px_0_10px_-4px_rgba(0,0,0,0.05)]">




                    <div className="flex flex-col whitespace-normal">
                      <span className="font-bold text-slate-800 leading-tight">{row.name}</span>
                      <span className="font-mono text-[10px] text-slate-400 tracking-tight mt-0.5">{row.code}</span>
                    </div>
                  </td>

                  
                  {/* Site Plan Columns */}
                  {projects.sites.map(p => (
                    <td key={p} className={`px-2 py-3 text-center border-r border-slate-100 text-[12px] ${row.sites[p] > 0 ? 'text-indigo-700 font-bold bg-indigo-50/10' : 'text-slate-200'}`}>
                      {row.sites[p] > 0 ? row.sites[p] : '-'}
                    </td>
                  ))}

                  {/* Warehouse Inventory Columns */}
                  {projects.warehouses.map(p => (
                    <td key={p} className={`px-2 py-3 text-center border-r border-slate-100 text-[12px] ${row.warehouses[p] > 0 ? 'text-emerald-700 font-bold bg-emerald-50/10' : 'text-slate-200'}`}>
                      {row.warehouses[p] > 0 ? row.warehouses[p] : '-'}
                    </td>
                  ))}

                  {/* Summary Columns */}
                  <td className="px-4 py-3 text-center border-r border-slate-100 font-bold text-indigo-900 bg-indigo-50/10 relative group/cell text-[12px] hover:z-50">
                    {row.totalDemand > 0 ? row.totalDemand : '-'}
                    <BreakdownTooltip items={row.details.demands} title="รายละเอียด Demand" />
                  </td>
                  
                  {/* Supply Actions */}
                  <td className={`px-2 py-3 text-center border-r border-slate-100 font-bold text-[12px] ${row.actions.dispatch > 0 ? 'text-amber-600 bg-amber-50/20' : 'text-slate-200'} relative group/cell hover:z-50`}>
                    {row.actions.dispatch > 0 ? row.actions.dispatch : '-'}
                    <BreakdownTooltip items={row.details.dispatch} title="เบิกจ่ายจากคลัง (Dispatch)" />
                  </td>
                  <td className={`px-2 py-3 text-center border-r border-slate-100 font-bold text-[12px] ${row.actions.circulate > 0 ? 'text-amber-600 bg-amber-50/20' : 'text-slate-200'} relative group/cell hover:z-50`}>
                    {row.actions.circulate > 0 ? row.actions.circulate : '-'}
                    <BreakdownTooltip items={row.details.circulate} title="หมุนเวียน (Circulate)" />
                  </td>
                  <td className={`px-2 py-3 text-center border-r border-slate-100 font-bold text-[12px] ${row.actions.substitute > 0 ? 'text-amber-600 bg-amber-50/20' : 'text-slate-200'} relative group/cell hover:z-50`}>
                    {row.actions.substitute > 0 ? row.actions.substitute : '-'}
                    <BreakdownTooltip items={row.details.substitute} title="สลับสเปก (Substitute)" />
                  </td>
                  <td className={`px-2 py-3 text-center border-r border-slate-100 font-bold text-[12px] ${row.actions.buy > 0 ? 'text-amber-700 bg-amber-50/20' : 'text-slate-200'} relative group/cell hover:z-50`}>
                    {row.actions.buy > 0 ? row.actions.buy : '-'}
                    <BreakdownTooltip items={row.details.buy} title="จัดซื้อ (Buy)" />
                  </td>
                  <td className={`px-2 py-3 text-center border-r border-slate-100 font-bold text-[12px] ${row.actions.rent > 0 ? 'text-amber-700 bg-amber-50/20' : 'text-slate-200'} relative group/cell hover:z-50`}>
                    {row.actions.rent > 0 ? row.actions.rent : '-'}
                    <BreakdownTooltip items={row.details.rent} title="เช่า (Rent)" />
                  </td>

                  <td className={`px-2 py-3 text-center border-r border-slate-100 font-bold text-[12px] ${row.pendingDemand > 0 ? 'text-rose-600 bg-rose-50/30' : (row.totalDemand > 0 ? 'text-emerald-600' : 'text-slate-200')} relative group/cell hover:z-50`}>
                    {row.pendingDemand > 0 ? `+${row.pendingDemand}` : (row.totalDemand > 0 ? '0' : '-')}
                    <BreakdownTooltip items={row.details.pendingDemands} title="รายละเอียดค้างส่ง (Site Demand)" />
                  </td>

                  {/* ส่งคืนได้ (S) */}
                  <td className={`px-2 py-3 text-center border-r border-slate-100 font-bold text-[12px] ${row.totalReturns > 0 ? 'text-indigo-600 bg-indigo-50/30' : 'text-slate-200'} relative group/cell hover:z-50`}>
                    {row.totalReturns > 0 ? row.totalReturns : '-'}
                    <BreakdownTooltip items={row.details.returns} title="รายละเอียดส่งคืนได้ (Site Supply)" side="left" />
                  </td>

                  {/* Return Actions */}
                  <td className={`px-2 py-3 text-center border-r border-slate-100 font-bold text-[12px] ${row.actions.receive > 0 ? 'text-emerald-600 bg-emerald-50/30' : 'text-slate-200'} relative group/cell hover:z-50`}>
                    {row.actions.receive > 0 ? row.actions.receive : '-'}
                    <BreakdownTooltip items={row.details.receive} title="รับคืนแล้ว (Received)" side="left" />
                  </td>
                  <td className={`px-2 py-3 text-center border-r border-slate-100 font-bold text-[12px] ${row.actions.reject > 0 ? 'text-rose-600 bg-rose-50/30' : 'text-slate-200'} relative group/cell hover:z-50`}>
                    {row.actions.reject > 0 ? row.actions.reject : '-'}
                    <BreakdownTooltip items={row.details.reject} title="ปฏิเสธการคืน (Rejected)" side="left" />
                  </td>

                  <td className={`px-4 py-3 text-center font-bold text-[12px] ${row.pendingReceipt > 0 ? 'text-blue-600 bg-blue-50/30' : (row.totalReturns > 0 || row.actions.receive > 0 || row.actions.reject > 0 ? 'text-emerald-600' : 'text-slate-200')} relative group/cell hover:z-50`}>
                    {row.pendingReceipt > 0 ? row.pendingReceipt : (row.totalReturns > 0 || row.actions.receive > 0 || row.actions.reject > 0 ? '0' : '-')}
                    <BreakdownTooltip items={row.details.pendingReceipts} title="รายละเอียดค้างรับ (Site Returns)" side="left" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
