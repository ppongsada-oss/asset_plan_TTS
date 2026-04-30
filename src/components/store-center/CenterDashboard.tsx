"use client";

import { PackageSearch, ArrowRightLeft, RefreshCw, ShoppingCart } from "lucide-react";

// Mock Data representing aggregated approved plans from various sites
const MOCK_CONSOLIDATED_REQUESTS = [
  { id: 101, project: "P1: Rama 9 Condo", item: "Tower Crane 8t", month: "Feb 2026", qty: 1, status: "รอจัดหา", urgency: "High" },
  { id: 102, project: "P1: Rama 9 Condo", item: "Bar Bender 32mm", month: "Mar 2026", qty: 3, status: "รอจัดหา", urgency: "Medium" },
  { id: 103, project: "P2: Sukhumvit Office", item: "High-Pressure Pump", month: "Feb 2026", qty: 2, status: "รอจัดหา", urgency: "High" },
];

export default function CenterDashboard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
      
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <PackageSearch size={20} className="text-indigo-600" />
            ตารางบริหารจัดการส่วนกลาง (Store Center Hub)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            รายการความต้องการอุปกรณ์ที่ผ่านการอนุมัติ (Approved) จากทุกโครงการ
          </p>
        </div>
        <div className="flex gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-100">
            High Urgency: 2
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
            Total Requests: 3
          </span>
        </div>
      </div>

      {/* Requests Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-100/50 text-slate-600 font-medium">
            <tr>
              <th className="px-6 py-4 border-b border-slate-200">โครงการ (Project)</th>
              <th className="px-6 py-4 border-b border-slate-200">รายการอุปกรณ์ (Item)</th>
              <th className="px-6 py-4 border-b border-slate-200 text-center">เดือนที่ต้องการ</th>
              <th className="px-6 py-4 border-b border-slate-200 text-center">จำนวน (Qty)</th>
              <th className="px-6 py-4 border-b border-slate-200 text-center">การดำเนินการ (Actions)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MOCK_CONSOLIDATED_REQUESTS.map((req) => (
              <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-800 border-r border-slate-50">
                  {req.project}
                  {req.urgency === "High" && <span className="ml-2 inline-block w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
                </td>
                <td className="px-6 py-4 font-medium text-indigo-700">
                  {req.item}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="px-2 py-1 bg-slate-100 rounded-md text-slate-600">{req.month}</span>
                </td>
                <td className="px-6 py-4 text-center font-bold text-slate-700">
                  {req.qty}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded hover:bg-amber-100 transition-colors" title="ดึงของหมุนเวียนจากไซต์อื่น">
                      <RefreshCw size={14} />
                      หมุนเวียน
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors" title="เปลี่ยนสเปก">
                      <ArrowRightLeft size={14} />
                      สลับสเปก
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors" title="ตัดสินใจเช่าหรือซื้อ">
                      <ShoppingCart size={14} />
                      จัดหา (Buy/Rent)
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
