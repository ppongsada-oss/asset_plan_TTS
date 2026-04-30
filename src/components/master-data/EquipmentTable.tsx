"use client";

import { Plus, Search, Filter, Download, UploadCloud, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";

type EquipmentItem = {
  id: number;
  item_code: string;
  name: string;
  category: string;
  sub_category: string;
  unit: string;
  buy_price: number;
  rent_price: number;
  lead_time: string;
};

export default function EquipmentTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [data, setData] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/equipment");
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDownloadTemplate = () => {
    window.location.href = "/api/equipment/template";
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/equipment/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success) {
        alert(json.message);
        fetchData(); // Refresh table
      } else {
        alert("Error: " + json.error);
      }
    } catch (error) {
      alert("Upload failed.");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header & Controls */}
      <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Equipment Master Data</h2>
          <p className="text-sm text-slate-500">จัดการข้อมูลอุปกรณ์และเครื่องจักรหลัก (21 หมวดย่อย)</p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full xl:w-auto">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="ค้นหารหัส หรือ ชื่อ..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <button 
            onClick={handleDownloadTemplate}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            <Download size={16} />
            โหลด Template CSV
          </button>

          <input 
            type="file" 
            accept=".csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
            อัปโหลดข้อมูล (Bulk)
          </button>

          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors">
            <Plus size={16} />
            เพิ่มรายการเดี่ยว
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
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                  <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                  กำลังโหลดข้อมูลจาก Database...
                </td>
              </tr>
            ) : data.length === 0 ? (
               <tr>
                 <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                   ไม่มีข้อมูลในระบบ กรุณาอัปโหลดผ่าน CSV หรือเพิ่มรายการใหม่
                 </td>
               </tr>
            ) : data.filter(i => i.name.includes(searchTerm) || i.item_code.includes(searchTerm)).map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4 font-medium text-indigo-600">{item.item_code}</td>
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-800">{item.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">หน่วย: {item.unit} • Leadtime: {item.lead_time}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium">
                    {item.category} / {item.sub_category}
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
