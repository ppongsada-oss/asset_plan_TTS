"use client";

import { Save, Send, Clock, AlertCircle } from "lucide-react";
import { useState } from "react";

// Mock Data structure based on the Excel "Project 1" sheet
const MATRIX_MONTHS = ["Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026"];

const MOCK_PROJECT_NEEDS = [
  { id: 1, code: "TC-001", name: "Tower Crane 8t", plan: { 0: 1, 1: 1, 2: 1, 3: 0 } },
  { id: 2, code: "HM-022", name: "High-Pressure Pump", plan: { 0: 0, 1: 2, 2: 2, 3: 1 } },
  { id: 3, code: "PT-105", name: "Bar Bender 32mm", plan: { 0: 3, 1: 3, 2: 5, 3: 5 } },
];

export default function PlanningWorksheet() {
  const [plans, setPlans] = useState(MOCK_PROJECT_NEEDS);

  const handleQtyChange = (itemId: number, monthIndex: number, val: string) => {
    const num = parseInt(val) || 0;
    setPlans(plans.map(p => {
      if (p.id === itemId) return { ...p, plan: { ...p.plan, [monthIndex]: num } };
      return p;
    }));
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
      {/* Worksheet Header */}
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            แบบฟอร์มร่างแผนอุปกรณ์ (Equipment Draft Plan)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            ระบุจำนวนเครื่องจักรและอุปกรณ์ที่ต้องใช้งานตามแผนงานเข้า-ออกรายเดือน
          </p>
        </div>
        
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
            <Save size={16} />
            Save Draft (บันทึกร่าง)
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors shadow-sm shadow-emerald-600/20">
            <Send size={16} />
            ส่งให้ PM อนุมัติ (Submit)
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border-b border-amber-100 p-3 px-6 flex items-start sm:items-center gap-3 text-sm text-amber-800">
        <AlertCircle size={18} className="shrink-0 mt-0.5 sm:mt-0 text-amber-600" />
        <p>คุณกำลังแก้ไขในสถานะ <strong>"ร่าง (Draft)"</strong> ข้อมูลเหล่านี้จะถูกนับเป็นความต้องการจริง (Demand) ต่อเมื่อ Project Manager (PM) กดอนุมัติแล้วเท่านั้น</p>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-100/50 text-slate-600 font-medium">
            <tr>
              <th className="px-6 py-4 border-b border-slate-200 w-64 sticky left-0 bg-slate-100/50">รายการอุปกรณ์ (Item)</th>
              {MATRIX_MONTHS.map((month, idx) => (
                <th key={idx} className="px-4 py-4 border-b border-slate-200 text-center min-w-[120px]">
                  {month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {plans.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50 group">
                <td className="px-6 py-4 sticky left-0 bg-white group-hover:bg-slate-50/50 font-medium text-slate-800 border-r border-slate-100 shadow-[1px_0_0_0_rgba(241,245,249,1)]">
                  {item.code} - {item.name}
                </td>
                {MATRIX_MONTHS.map((_, mIdx) => (
                  <td key={mIdx} className="px-4 py-2 text-center">
                    <div className="flex justify-center">
                      <input
                        type="number"
                        min="0"
                        className={`w-20 text-center py-1.5 border rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-colors ${
                          item.plan[mIdx as keyof typeof item.plan] > 0 
                            ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold" 
                            : "bg-white border-slate-200 text-slate-400"
                        }`}
                        value={item.plan[mIdx as keyof typeof item.plan] || ""}
                        onChange={(e) => handleQtyChange(item.id, mIdx, e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
    </div>
  );
}
