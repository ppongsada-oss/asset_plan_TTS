"use client";

import { CheckCircle, XCircle, FileSearch } from "lucide-react";

const MATRIX_MONTHS = ["Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026"];

// Simulated pending data from Store Site
const MOCK_PENDING_DATA = [
  { id: 1, code: "TC-001", name: "Tower Crane 8t", plan: { 0: 1, 1: 1, 2: 1, 3: 0 } },
  { id: 2, code: "PT-105", name: "Bar Bender 32mm", plan: { 0: 3, 1: 3, 2: 5, 3: 5 } },
];

export default function PMReviewTable() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
      
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <FileSearch size={20} className="text-indigo-600" />
            ตรวจสอบแผนอุปกรณ์ (PM Review)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            แผนที่ร่างโดย Store Site กรุณาตรวจสอบความถูกต้องก่อนส่งเข้าคลังกลาง
          </p>
        </div>
        
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 transition-colors">
            <XCircle size={18} />
            Reject (ตีกลับแก้ไข)
          </button>
          <button className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-600/20">
            <CheckCircle size={18} />
            Approve (อนุมัติส่ง Center)
          </button>
        </div>
      </div>

      {/* Review Table (Read Only) */}
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
            {MOCK_PENDING_DATA.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50">
                <td className="px-6 py-4 sticky left-0 bg-white font-medium text-slate-800 border-r border-slate-100">
                  {item.code} - {item.name}
                </td>
                {MATRIX_MONTHS.map((_, mIdx) => {
                  const val = item.plan[mIdx as keyof typeof item.plan] || 0;
                  return (
                    <td key={mIdx} className="px-4 py-3 text-center">
                      {val > 0 ? (
                        <div className="inline-flex items-center justify-center w-12 py-1 bg-indigo-50 text-indigo-700 font-semibold rounded-md border border-indigo-100">
                          {val}
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
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
