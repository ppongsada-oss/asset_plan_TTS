"use client";

import { Loader2 } from "lucide-react";

type EquipmentItem = {
  id: number;
  item_code: string;
  name: string;
  category_code: string;
  category_name: string;
  sub_category_code: string;
  sub_category_name: string;
  unit: string;
  buy_price: number;
  rent_price: number;
  lead_time: string;
  remaining_stock: number;
};

interface EquipmentListTableProps {
  items: EquipmentItem[];
  loading: boolean;
  searchTerm: string;
  calibratedInventory: Record<number, { wh: number, site: number }>;
  onEdit: (item: EquipmentItem) => void;
}

export default function EquipmentListTable({
  items,
  loading,
  searchTerm,
  calibratedInventory,
  onEdit
}: EquipmentListTableProps) {
  
  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    i.item_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative overflow-x-auto overflow-y-auto max-h-[600px] border-t border-slate-200">
      <table className="w-full text-left text-sm text-slate-600 border-separate border-spacing-0">
        <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10">
          <tr>
            <th className="px-4 py-4 font-semibold border-b border-slate-200 bg-slate-50 text-center w-12 border-t-4 border-slate-300">#</th>
            <th className="px-6 py-4 font-semibold border-b border-slate-200 bg-slate-50 border-t-4 border-slate-300">Item Code</th>
            <th className="px-6 py-4 font-semibold border-b border-slate-200 bg-slate-50 border-t-4 border-slate-300">รายการ (Name)</th>
            <th className="px-6 py-4 font-semibold text-center border-b border-slate-200 bg-slate-50 border-t-4 border-slate-300">คงเหลือ (คลัง)</th>
            <th className="px-6 py-4 font-semibold text-center border-b border-slate-200 bg-slate-50 border-t-4 border-slate-300">คงค้าง (หน่วยงาน)</th>
            <th className="px-6 py-4 font-semibold text-center bg-indigo-50 border-b border-slate-200 border-t-4 border-indigo-500">รวมทั้งระบบ</th>
            <th className="px-6 py-4 font-semibold border-b border-slate-200 bg-slate-50 border-t-4 border-slate-300">ราคาซื้อ/เช่า</th>
            <th className="px-6 py-4 font-semibold text-right border-b border-slate-200 bg-slate-50 border-t-4 border-slate-300">จัดการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                <Loader2 className="animate-spin mx-auto mb-2 text-indigo-500" size={32} />
                <span className="font-medium">กำลังโหลดข้อมูล...</span>
              </td>
            </tr>
          ) : filteredItems.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                {searchTerm ? `ไม่พบข้อมูลที่ตรงกับ "${searchTerm}"` : "ไม่มีข้อมูลในระบบ"}
              </td>
            </tr>
          ) : filteredItems.map((item, index) => (
            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-4 py-4 text-center text-slate-400 font-mono text-xs border-r border-slate-50">{index + 1}</td>
              <td className="px-6 py-4 font-medium text-indigo-600 whitespace-nowrap">{item.item_code}</td>
              <td className="px-6 py-4">
                <div className="font-medium text-slate-800 leading-tight">{item.name}</div>
                <div className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-mono">
                  {item.category_name || item.category_code} / {item.sub_category_name || item.sub_category_code}
                </div>
              </td>
              <td className="px-6 py-4 text-center">
                <span className="font-semibold text-slate-700">
                  {(calibratedInventory[item.id]?.wh || 0).toLocaleString()}
                </span>
              </td>
              <td className="px-6 py-4 text-center">
                <span className="font-semibold text-slate-700">
                  {(calibratedInventory[item.id]?.site || 0).toLocaleString()}
                </span>
              </td>
              <td className="px-6 py-4 text-center bg-indigo-50/30">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  ((calibratedInventory[item.id]?.wh || 0) + (calibratedInventory[item.id]?.site || 0)) > 0 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                  : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                  {((calibratedInventory[item.id]?.wh || 0) + (calibratedInventory[item.id]?.site || 0)).toLocaleString()}
                </span>
              </td>
              <td className="px-6 py-4 text-xs">
                <div className="flex flex-col gap-0.5">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Buy:</span>
                    <span className="font-medium text-slate-700">฿{item.buy_price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-2 border-t border-slate-50 pt-0.5">
                    <span className="text-slate-400">Rent:</span>
                    <span className="font-medium text-slate-500">฿{item.rent_price.toLocaleString()}</span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-right">
                <button 
                  onClick={() => onEdit(item)} 
                  className="px-3 py-1.5 text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 rounded-md transition-all font-medium text-xs"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
