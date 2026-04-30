"use client";

import { Plus, Search, Download, UploadCloud, Loader2, Layers } from "lucide-react";
import { useState, useEffect, useRef } from "react";

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

type Category = {
  code: string;
  name: string;
};

type SubCategory = {
  code: string;
  category_code: string;
  name: string;
};

export default function EquipmentTable() {
  const [activeTab, setActiveTab] = useState<"EQUIPMENT" | "CATEGORY">("EQUIPMENT");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Data States
  const [data, setData] = useState<EquipmentItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states for Category
  const [newCatCode, setNewCatCode] = useState("");
  const [newCatName, setNewCatName] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const resEq = await fetch("/api/equipment");
      const jsonEq = (await resEq.json()) as any;
      if (jsonEq.success) setData(jsonEq.data);

      const resCat = await fetch("/api/categories");
      const jsonCat = (await resCat.json()) as any;
      if (jsonCat.success) {
        setCategories(jsonCat.categories);
        setSubCategories(jsonCat.sub_categories);
      }
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
      const json = (await res.json()) as any;
      if (json.success) {
        alert(json.message);
        fetchData();
      } else {
        alert("Error: " + json.error);
      }
    } catch (error) {
      alert("Upload failed.");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatCode || !newCatName) return;
    
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "category", code: newCatCode, name: newCatName }),
      });
      const json = (await res.json()) as any;
      if (json.success) {
        setNewCatCode("");
        setNewCatName("");
        fetchData();
      } else {
        alert(json.message);
      }
    } catch (e) {
      alert("Failed to add category");
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50">
        <button 
          onClick={() => setActiveTab("EQUIPMENT")}
          className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === "EQUIPMENT" ? "text-indigo-600 border-b-2 border-indigo-600 bg-white" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}
        >
          รายการอุปกรณ์และเครื่องจักร
        </button>
        <button 
          onClick={() => setActiveTab("CATEGORY")}
          className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === "CATEGORY" ? "text-indigo-600 border-b-2 border-indigo-600 bg-white" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}
        >
          ตั้งค่าหมวดหมู่ (Categories)
        </button>
      </div>

      {activeTab === "EQUIPMENT" && (
        <>
          {/* Header & Controls */}
          <div className="p-6 border-b border-slate-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">Equipment Master Data</h2>
              <p className="text-sm text-slate-500">จัดการข้อมูลอุปกรณ์หลักและยอดคงเหลือ (Stock)</p>
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
              
              <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors">
                <Download size={16} /> โหลด Template CSV
              </button>

              <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-50">
                {uploading ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                อัปโหลดข้อมูล (Bulk)
              </button>

              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors">
                <Plus size={16} /> เพิ่มรายการ
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
                  <th className="px-6 py-4 font-semibold">หมวดหมู่</th>
                  <th className="px-6 py-4 font-semibold">ยอดคงเหลือ (Stock)</th>
                  <th className="px-6 py-4 font-semibold">ราคาซื้อ/เช่า</th>
                  <th className="px-6 py-4 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400"><Loader2 className="animate-spin mx-auto mb-2" size={24} />กำลังโหลด...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400">ไม่มีข้อมูลในระบบ</td></tr>
                ) : data.filter(i => i.name.includes(searchTerm) || i.item_code.includes(searchTerm)).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-indigo-600">{item.item_code}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{item.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">หน่วย: {item.unit} • Leadtime: {item.lead_time}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
                        {item.category_name || item.category_code} / {item.sub_category_name || item.sub_category_code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${item.remaining_stock > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {item.remaining_stock} {item.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div>Buy: ฿{item.buy_price.toLocaleString()}</div>
                      <div className="text-slate-400 mt-0.5">Rent: ฿{item.rent_price.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-indigo-600 hover:text-indigo-800 font-medium text-sm">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "CATEGORY" && (
        <div className="p-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <Layers className="text-indigo-600" />
            ลงทะเบียนหมวดหมู่อุปกรณ์
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Category Form */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <h3 className="font-medium text-slate-800 mb-4">เพิ่มหมวดหลัก (Main Category)</h3>
              <form onSubmit={handleAddCategory} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">รหัสหมวด (Code) เช่น A, B, C</label>
                  <input type="text" required value={newCatCode} onChange={e => setNewCatCode(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">ชื่อหมวด (Name) เช่น เครื่องจักร</label>
                  <input type="text" required value={newCatName} onChange={e => setNewCatName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm">
                  บันทึกหมวดหลัก
                </button>
              </form>

              <div className="mt-8">
                <h4 className="text-sm font-medium text-slate-600 mb-3 border-b pb-2">หมวดหลักในระบบ</h4>
                <ul className="space-y-2">
                  {categories.map(c => (
                    <li key={c.code} className="flex justify-between text-sm bg-white p-2 rounded border">
                      <span className="font-mono text-indigo-600 font-semibold">{c.code}</span>
                      <span>{c.name}</span>
                    </li>
                  ))}
                  {categories.length === 0 && <li className="text-xs text-slate-400">ยังไม่มีข้อมูล</li>}
                </ul>
              </div>
            </div>

            {/* Sub Category Form placeholder */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 opacity-70">
              <h3 className="font-medium text-slate-800 mb-4">เพิ่มหมวดย่อย (Sub Category)</h3>
              <p className="text-xs text-slate-500 mb-4">ฟังก์ชันนี้เตรียมไว้สำหรับจับคู่ Sub Category กับ Category หลัก (รอการพัฒนาต่อ)</p>
              
              <div className="mt-8">
                <h4 className="text-sm font-medium text-slate-600 mb-3 border-b pb-2">หมวดย่อยในระบบ</h4>
                <ul className="space-y-2">
                  {subCategories.map(s => (
                    <li key={s.code} className="flex justify-between text-sm bg-white p-2 rounded border">
                      <span className="font-mono text-indigo-600 font-semibold">{s.code}</span>
                      <span>{s.name} <span className="text-xs text-slate-400">({s.category_code})</span></span>
                    </li>
                  ))}
                  {subCategories.length === 0 && <li className="text-xs text-slate-400">ยังไม่มีข้อมูล</li>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
