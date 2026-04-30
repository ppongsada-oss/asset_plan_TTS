"use client";

import { Plus, Search, Filter } from "lucide-react";
import { useState } from "react";

// Mock Data from Requirements
const MOCK_DATA = [
  { id: 1, code: "TC-001", name: "Tower Crane 8t", category: "A (เครื่องจักร)", sub: "A1", unit: "ตัว", buy_price: 2500000, rent_price: 150000, lead: "30 Days" },
  { id: 2, code: "HM-022", name: "High-Pressure Pump", category: "A (เครื่องจักร)", sub: "A3", unit: "เครื่อง", buy_price: 500000, rent_price: 45000, lead: "15 Days" },
  { id: 3, code: "PT-105", name: "Bar Bender 32mm", category: "B (เครื่องมือไฟฟ้า)", sub: "B3", unit: "เครื่อง", buy_price: 45000, rent_price: 5000, lead: "7 Days" },
];

export default function EquipmentTable() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header & Controls */}
      <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Equipment Master Data</h2>
          <p className="text-sm text-slate-500">จัดการข้อมูลอุปกรณ์และเครื่องจักรหลัก (21 หมวดย่อย)</p>
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="ค้นหารหัส หรือ ชื่อ..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <Filter size={16} />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors">
            <Plus size={16} />
            เพิ่มอุปกรณ์
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-600">
          <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-semibold">Item Code</th>
              <th className="px-6 py-4 font-semibold">รายการ (Name)</th>
              <th className="px-6 py-4 font-semibold">หมวดหลัก</th>
              <th className="px-6 py-4 font-semibold">ราคาซื้อ (Buy)</th>
              <th className="px-6 py-4 font-semibold">ราคาเช่า (Rent)</th>
              <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {MOCK_DATA.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-indigo-600">{item.code}</td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-800">{item.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">หน่วย: {item.unit} • Leadtime: {item.lead}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium">
                    {item.category}
                  </span>
                </td>
                <td className="px-6 py-4">฿{item.buy_price.toLocaleString()}</td>
                <td className="px-6 py-4">฿{item.rent_price.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-indigo-600 hover:text-indigo-800 font-medium text-sm">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
