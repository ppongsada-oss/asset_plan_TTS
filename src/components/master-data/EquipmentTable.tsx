"use client";

import { Plus, Search, Download, UploadCloud, Loader2, Layers, ChevronDown, ChevronRight, Settings, Database, Eye } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import useSWR, { mutate } from "swr";

const fetcher = (url: string): Promise<any> => fetch(url).then((res) => res.json());
import EquipmentListTable from "./EquipmentListTable";
import * as XLSX from "xlsx";

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

  // Planning Cycles for Inventory Calibration
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycleForUpload, setSelectedCycleForUpload] = useState<string>("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [viewCycleId, setViewCycleId] = useState<string>(""); // Default to empty, will be set to latest
  const [calibratedInventory, setCalibratedInventory] = useState<Record<number, { wh: number, site: number }>>({});

  // SWR Hook calls for client-side caching & Stale-While-Revalidate
  const { data: eqData } = useSWR("/api/equipment", fetcher);
  const { data: catData } = useSWR("/api/categories", fetcher);
  const { data: cyclesData } = useSWR("/api/center/cycles", fetcher);
  const { data: invData } = useSWR(viewCycleId ? `/api/inventory?cycle_id=${viewCycleId}` : null, fetcher);

  useEffect(() => {
    if (eqData?.success) setData(eqData.data);
  }, [eqData]);

  useEffect(() => {
    if (catData?.success) {
      setCategories(catData.categories);
      setSubCategories(catData.sub_categories);
    }
  }, [catData]);

  useEffect(() => {
    if (cyclesData?.success && cyclesData.data.length > 0) {
      setCycles(cyclesData.data);
      if (!viewCycleId) {
        setViewCycleId(String(cyclesData.data[0].id));
      }
    }
  }, [cyclesData, viewCycleId]);

  useEffect(() => {
    if (invData?.success) {
      const invMap: Record<number, { wh: number, site: number }> = {};
      invData.data.forEach((item: any) => {
        if (!invMap[item.equipment_id]) {
          invMap[item.equipment_id] = { wh: 0, site: 0 };
        }
        if (item.project_id.startsWith("WH")) {
          invMap[item.equipment_id].wh += item.qty;
        } else {
          invMap[item.equipment_id].site += item.qty;
        }
      });
      setCalibratedInventory(invMap);
    }
  }, [invData]);

  useEffect(() => {
    if (eqData && catData && cyclesData) {
      setLoading(false);
    } else {
      setLoading(true);
    }
  }, [eqData, catData, cyclesData]);


  // Form states for Category
  const [newCatCode, setNewCatCode] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [newSubCatCode, setNewSubCatCode] = useState("");
  const [newSubCatName, setNewSubCatName] = useState("");
  const [newSubCatParent, setNewSubCatParent] = useState("");

  const [editItem, setEditItem] = useState<EquipmentItem | null>(null);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [editSubCategory, setEditSubCategory] = useState<SubCategory | null>(null);

  // Category Preview Modal states
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [showAddSubCatModal, setShowAddSubCatModal] = useState(false);
  const [previewCatCode, setPreviewCatCode] = useState("");
  const [previewCatName, setPreviewCatName] = useState("");
  const [previewSubCatCode, setPreviewSubCatCode] = useState("");
  const [previewSubCatName, setPreviewSubCatName] = useState("");
  const [previewSubCatParent, setPreviewSubCatParent] = useState("");

  // Sub-category and Equipment add states
  const [expandedSubCategories, setExpandedSubCategories] = useState<Record<string, boolean>>({});
  const [showAddEqModal, setShowAddEqModal] = useState(false);
  const [selectedSubForAddEq, setSelectedSubForAddEq] = useState<SubCategory | null>(null);
  const [newEqCode, setNewEqCode] = useState("");
  const [newEqName, setNewEqName] = useState("");
  const [newEqUnit, setNewEqUnit] = useState("ชิ้น");
  const [newEqBuyPrice, setNewEqBuyPrice] = useState(0);
  const [newEqRentPrice, setNewEqRentPrice] = useState(0);
  const [newEqLeadTime, setNewEqLeadTime] = useState("30 วัน");
  const [newEqStock, setNewEqStock] = useState(0);

  // Helpers for code generation
  const getNextCategoryCode = () => {
    if (categories.length === 0) return "A";
    const codes = categories.map(c => c.code.toUpperCase()).sort();
    const lastCode = codes[codes.length - 1];
    
    let charCodes = Array.from(lastCode).map(c => c.charCodeAt(0));
    let i = charCodes.length - 1;
    while (i >= 0) {
      if (charCodes[i] < 90) { // < 'Z'
        charCodes[i]++;
        break;
      } else {
        charCodes[i] = 65; // 'A'
        i--;
      }
    }
    if (i < 0) {
      charCodes.unshift(65);
    }
    return String.fromCharCode(...charCodes);
  };

  const getNextSubCategoryCode = (parentCode: string) => {
    const subsOfParent = subCategories.filter(s => s.category_code === parentCode);
    if (subsOfParent.length === 0) {
      return `${parentCode}01`;
    }
    let maxNum = 0;
    let hasPrefix = false;
    subsOfParent.forEach(s => {
      let codeStr = s.code;
      if (codeStr.startsWith(parentCode)) {
        hasPrefix = true;
        codeStr = codeStr.substring(parentCode.length);
      }
      const num = parseInt(codeStr);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    });
    const nextNumStr = String(maxNum + 1).padStart(2, "0");
    return hasPrefix ? `${parentCode}${nextNumStr}` : nextNumStr;
  };

  const getSubCategoryEquipmentCount = (subCode: string) => {
    return data.filter(item => item.sub_category_code === subCode).length;
  };

  const toggleCategoryExpand = (code: string) => {
    setExpandedCategories(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const getNextEquipmentCode = (subCode: string) => {
    const itemsInSub = data.filter(item => item.sub_category_code === subCode);
    if (itemsInSub.length === 0) {
      return `${subCode}-001`;
    }
    
    let maxNum = 0;
    let separator = "-";
    itemsInSub.forEach(item => {
      let codeStr = item.item_code;
      if (codeStr.startsWith(subCode)) {
        let suffix = codeStr.substring(subCode.length);
        if (suffix.startsWith("-")) {
          separator = "-";
          suffix = suffix.substring(1);
        } else {
          separator = "";
        }
        const num = parseInt(suffix);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
    
    const nextNumStr = String(maxNum + 1).padStart(3, "0");
    return `${subCode}${separator}${nextNumStr}`;
  };

  const toggleSubCategoryExpand = (code: string) => {
    setExpandedSubCategories(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const handleExportCategories = () => {
    const exportData: any[] = [];
    categories.forEach(cat => {
      const subs = subCategories.filter(s => s.category_code === cat.code);
      if (subs.length === 0) {
        exportData.push({
          'รหัสหมวดหลัก (Main Code)': cat.code,
          'ชื่อหมวดหลัก (Main Name)': cat.name,
          'รหัสหมวดย่อย (Sub Code)': '-',
          'ชื่อหมวดย่อย (Sub Name)': '-',
          'จำนวนอุปกรณ์ (Count)': 0
        });
      } else {
        subs.forEach(sub => {
          exportData.push({
            'รหัสหมวดหลัก (Main Code)': cat.code,
            'ชื่อหมวดหลัก (Main Name)': cat.name,
            'รหัสหมวดย่อย (Sub Code)': sub.code,
            'ชื่อหมวดย่อย (Sub Name)': sub.name,
            'จำนวนอุปกรณ์ (Count)': getSubCategoryEquipmentCount(sub.code)
          });
        });
      }
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Categories");
    XLSX.writeFile(wb, `Category_Structure_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleAddCatFromPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewCatCode || !previewCatName) return;

    if (categories.some(c => c.code.toLowerCase() === previewCatCode.toLowerCase())) {
      alert("รหัสหมวดหมู่ซ้ำในระบบ");
      return;
    }
    if (categories.some(c => c.name.toLowerCase() === previewCatName.toLowerCase())) {
      alert("ชื่อหมวดหมู่ซ้ำในระบบ");
      return;
    }

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "category", code: previewCatCode, name: previewCatName }),
      });
      const json = await res.json() as any;
      if (json.success) {
        setShowAddCatModal(false);
        setPreviewCatName("");
        fetchData();
      } else {
        alert(json.message);
      }
    } catch (e) {
      alert("Failed to add category");
    }
  };

  const handleAddSubCatFromPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewSubCatCode || !previewSubCatName || !previewSubCatParent) return;

    if (subCategories.some(s => s.code.toLowerCase() === previewSubCatCode.toLowerCase())) {
      alert("รหัสหมวดย่อยซ้ำในระบบ");
      return;
    }
    if (subCategories.some(s => s.name.toLowerCase() === previewSubCatName.toLowerCase() && s.category_code === previewSubCatParent)) {
      alert("ชื่อหมวดย่อยซ้ำในหมวดหมู่นี้");
      return;
    }

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "sub_category", code: previewSubCatCode, name: previewSubCatName, category_code: previewSubCatParent }),
      });
      const json = await res.json() as any;
      if (json.success) {
        setShowAddSubCatModal(false);
        setPreviewSubCatName("");
        setPreviewSubCatParent("");
        fetchData();
      } else {
        alert(json.message);
      }
    } catch (e) {
      alert("Failed to add sub-category");
    }
  };

  const handleAddEquipmentFromPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEqCode || !newEqName || !selectedSubForAddEq) return;

    if (data.some(item => item.item_code.toLowerCase() === newEqCode.toLowerCase())) {
      alert(`รหัสอุปกรณ์ "${newEqCode}" มีอยู่ในระบบแล้ว!`);
      return;
    }

    try {
      const res = await fetch("/api/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_code: newEqCode,
          name: newEqName,
          category_code: selectedSubForAddEq.category_code,
          sub_category_code: selectedSubForAddEq.code,
          unit: newEqUnit,
          buy_price: newEqBuyPrice,
          rent_price: newEqRentPrice,
          lead_time: newEqLeadTime,
          remaining_stock: newEqStock,
        }),
      });
      const json = await res.json() as any;
      if (json.success) {
        setShowAddEqModal(false);
        setNewEqName("");
        setNewEqBuyPrice(0);
        setNewEqRentPrice(0);
        setNewEqStock(0);
        fetchData();
      } else {
        alert("Failed to create equipment: " + json.error);
      }
    } catch (e) {
      console.error(e);
      alert("Error creating equipment.");
    }
  };

  // Dropdown States
  const [activeMenu, setActiveMenu] = useState<"CATALOG" | "STOCK" | null>(null);
  const catalogMenuRef = useRef<HTMLDivElement>(null);
  const stockMenuRef = useRef<HTMLDivElement>(null);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeMenu === "CATALOG" && catalogMenuRef.current && !catalogMenuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
      if (activeMenu === "STOCK" && stockMenuRef.current && !stockMenuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeMenu]);

  const fetchData = async () => {
    mutate("/api/equipment");
    mutate("/api/categories");
    mutate("/api/center/cycles");
  };

  const fetchCalibratedInventory = async (cycleId: string) => {
    if (cycleId) {
      mutate(`/api/inventory?cycle_id=${cycleId}`);
    }
  };

  const handleDownloadTemplate = () => {
    window.location.href = "/api/equipment/template";
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const overwrite = confirm(
      "ต้องการเขียนทับข้อมูลอุปกรณ์เดิมที่รหัสตรงกันด้วยข้อมูลใหม่จากไฟล์ใช่หรือไม่?\n\n" +
      "• กด 'ตกลง' (OK) เพื่อเขียนทับ (Overwrite) ข้อมูลเดิม\n" +
      "• กด 'ยกเลิก' (Cancel) เพื่อปฏิเสธ (Skip) และคงข้อมูลเดิมไว้"
    );

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/equipment/upload?overwrite=${overwrite}`, {
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

  const inventoryInputRef = useRef<HTMLInputElement>(null);
  const [inventoryUploading, setInventoryUploading] = useState(false);
  const [inventoryUploadProgress, setInventoryUploadProgress] = useState({ current: 0, total: 0 });

  const handleInventoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!selectedCycleForUpload) {
      alert("Please select a cycle first.");
      return;
    }

    setInventoryUploading(true);
    setInventoryUploadProgress({ current: 0, total: 0 });
    const formData = new FormData();
    formData.append("file", file);

    try {
      // 1. PARSE: Upload and parse excel rows
      const parseRes = await fetch(`/api/inventory/upload?action=parse&cycle_id=${selectedCycleForUpload}`, {
        method: "POST",
        body: formData,
      });
      const parseJson = (await parseRes.json()) as any;
      if (!parseJson.success) {
        alert("Parse Error: " + (parseJson.error || "Unknown error"));
        setInventoryUploading(false);
        if (inventoryInputRef.current) inventoryInputRef.current.value = "";
        return;
      }

      const inserts = parseJson.validInserts || [];
      const total = inserts.length;
      if (total === 0) {
        alert("ไม่พบข้อมูลอุปกรณ์คงเหลือที่ถูกต้องในไฟล์ Excel");
        setInventoryUploading(false);
        if (inventoryInputRef.current) inventoryInputRef.current.value = "";
        return;
      }

      setInventoryUploadProgress({ current: 0, total });

      // 2. CLEAR: Wipe current inventory baseline of the cycle
      const clearRes = await fetch(`/api/inventory/upload?action=clear&cycle_id=${selectedCycleForUpload}`, {
        method: "POST",
      });
      const clearJson = (await clearRes.json()) as any;
      if (!clearJson.success) {
        alert("Clear Error: " + (clearJson.error || "Failed to clear existing stock"));
        setInventoryUploading(false);
        if (inventoryInputRef.current) inventoryInputRef.current.value = "";
        return;
      }

      // 3. INSERT: Upload batches of 500
      const chunkSize = 500;
      for (let i = 0; i < total; i += chunkSize) {
        const batch = inserts.slice(i, i + chunkSize);
        const insertRes = await fetch(`/api/inventory/upload?action=insert&cycle_id=${selectedCycleForUpload}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inserts: batch }),
        });
        const insertJson = (await insertRes.json()) as any;
        if (!insertJson.success) {
          throw new Error(insertJson.error || "Failed to insert batch");
        }
        setInventoryUploadProgress({ current: Math.min(i + batch.length, total), total });
      }

      alert(`อัปเดตยอดสต็อกสำเร็จทั้งหมด ${total} รายการ!`);
      setShowUploadModal(false);
      fetchData();
      fetchCalibratedInventory(viewCycleId);
    } catch (error: any) {
      alert("Inventory upload failed: " + (error.message || error));
    } finally {
      setInventoryUploading(false);
      if (inventoryInputRef.current) inventoryInputRef.current.value = "";
    }
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

  const handleAddSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubCatCode || !newSubCatName || !newSubCatParent) return;
    
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "sub_category", code: newSubCatCode, name: newSubCatName, category_code: newSubCatParent }),
      });
      const json = (await res.json()) as any;
      if (json.success) {
        setNewSubCatCode("");
        setNewSubCatName("");
        setNewSubCatParent("");
        fetchData();
      } else {
        alert(json.message);
      }
    } catch (e) {
      alert("Failed to add sub-category");
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;

    try {
      const res = await fetch("/api/equipment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editItem),
      });
      const json = await res.json() as any;
      if (json.success) {
        setEditItem(null);
        fetchData();
      } else {
        alert("Failed to save: " + json.error);
      }
    } catch (e) {
      alert("Failed to save equipment");
    }
  };

  const handleEditCategorySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCategory) return;
    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "category", code: editCategory.code, name: editCategory.name }),
      });
      const json = await res.json() as any;
      if (json.success) {
        setEditCategory(null);
        fetchData();
      } else alert(json.message);
    } catch (e) { alert("Failed to save category"); }
  };

  const handleDeleteCategory = async (code: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      const res = await fetch("/api/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "category", code }),
      });
      const json = await res.json() as any;
      if (json.success) fetchData();
      else alert(json.message);
    } catch (e) { alert("Failed to delete category"); }
  };

  const handleEditSubCategorySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSubCategory) return;
    try {
      const res = await fetch("/api/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "sub_category", code: editSubCategory.code, name: editSubCategory.name }),
      });
      const json = await res.json() as any;
      if (json.success) {
        setEditSubCategory(null);
        fetchData();
      } else alert(json.message);
    } catch (e) { alert("Failed to save sub-category"); }
  };

  const handleDeleteSubCategory = async (code: string) => {
    if (!confirm("Are you sure you want to delete this sub-category?")) return;
    try {
      const res = await fetch("/api/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "sub_category", code }),
      });
      const json = await res.json() as any;
      if (json.success) fetchData();
      else alert(json.message);
    } catch (e) { alert("Failed to delete sub-category"); }
  };

  const handleDownloadInventoryTemplate = () => {
    window.location.href = "/api/inventory/template";
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
          <div className="p-6 border-b border-slate-200">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Left Column: Title & Filters (Primary focus) */}
              <div className="flex-1 flex flex-col gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Equipment Master Data</h2>
                  <p className="text-sm text-slate-500 mt-1">บริหารจัดการข้อมูลอุปกรณ์และสต็อกสินค้าส่วนกลาง</p>
                </div>

                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                      <Settings size={12} /> รอบการวางแผน (Planning Cycle)
                    </label>
                    <div className="relative">
                      <select 
                        value={viewCycleId}
                        onChange={(e) => setViewCycleId(e.target.value)}
                        className="w-full pl-3 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-indigo-700 outline-none appearance-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm"
                      >
                        {cycles.length === 0 && <option value="">(ไม่มีข้อมูล Cycle)</option>}
                        {cycles.map(c => (
                          <option key={c.id} value={c.id}>{c.cycle_number} - {c.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex-[1.5] w-full">
                    <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                      <Search size={12} /> ค้นหาอุปกรณ์
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="ค้นหาด้วย รหัส หรือ ชื่ออุปกรณ์..." 
                        className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {Object.keys(calibratedInventory).length === 0 && !loading && (
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 rounded-xl border border-amber-100 text-amber-700 animate-in slide-in-from-left duration-500">
                    <span className="text-lg">⚠️</span>
                    <p className="text-xs font-medium">
                      ยังไม่มีข้อมูลการสอบทานสต็อกสำหรับงวดนี้ <span className="hidden sm:inline">|</span> <span className="font-bold underline">กรุณาอัปโหลดไฟล์ในเมนูจัดการสต็อกทางด้านขวา</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Right Column: Actions (Dropdowns) */}
              <div className="lg:w-[320px] flex flex-col gap-3 justify-end pb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">เมนูจัดการข้อมูล</span>
                
                {/* Catalog Management Dropdown */}
                <div className="relative" ref={catalogMenuRef}>
                  <button 
                    onClick={() => setActiveMenu(activeMenu === "CATALOG" ? null : "CATALOG")}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all duration-200 ${
                      activeMenu === "CATALOG" 
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" 
                      : "bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:bg-slate-50 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${activeMenu === "CATALOG" ? "bg-white/20" : "bg-indigo-50 text-indigo-600"}`}>
                        <Database size={18} />
                      </div>
                      <span className="font-semibold text-sm">จัดการรายการสินค้า (Catalog)</span>
                    </div>
                    <ChevronDown size={18} className={`transition-transform duration-200 ${activeMenu === "CATALOG" ? "rotate-180" : ""}`} />
                  </button>

                  {activeMenu === "CATALOG" && (
                    <div className="absolute left-0 right-0 mt-2 p-2 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 animate-in fade-in zoom-in duration-200 origin-top">
                      <button onClick={() => { handleDownloadTemplate(); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors group">
                        <Download size={16} className="text-slate-400 group-hover:text-emerald-500" />
                        <span>ดาวน์โหลด Template (CSV)</span>
                        <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                      </button>
                      <button onClick={() => { fileInputRef.current?.click(); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors group">
                        <UploadCloud size={16} className="text-slate-400 group-hover:text-indigo-500" />
                        <span>อัปโหลด Catalog (CSV)</span>
                        <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                      </button>
                      <div className="my-1 border-t border-slate-100" />
                      <button onClick={() => { setShowPreviewModal(true); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm">
                        <Plus size={16} />
                        <span className="font-medium">เพิ่มรายการใหม่</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Stock Management Dropdown */}
                <div className="relative" ref={stockMenuRef}>
                  <button 
                    onClick={() => setActiveMenu(activeMenu === "STOCK" ? null : "STOCK")}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all duration-200 ${
                      activeMenu === "STOCK" 
                      ? "bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-100" 
                      : "bg-white border-slate-200 text-slate-700 hover:border-amber-400 hover:bg-slate-50 shadow-sm"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${activeMenu === "STOCK" ? "bg-white/20" : "bg-amber-50 text-amber-600"}`}>
                        <Layers size={18} />
                      </div>
                      <span className="font-semibold text-sm">จัดการ Remaining Stock</span>
                    </div>
                    <ChevronDown size={18} className={`transition-transform duration-200 ${activeMenu === "STOCK" ? "rotate-180" : ""}`} />
                  </button>

                  {activeMenu === "STOCK" && (
                    <div className="absolute left-0 right-0 mt-2 p-2 bg-white rounded-xl shadow-2xl border border-slate-100 z-50 animate-in fade-in zoom-in duration-200 origin-top">
                      <button onClick={() => { handleDownloadInventoryTemplate(); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors group">
                        <Download size={16} className="text-slate-400 group-hover:text-amber-500" />
                        <span>ดาวน์โหลด Template (Excel)</span>
                        <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                      </button>
                      <button onClick={() => { setShowUploadModal(true); setActiveMenu(null); }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-slate-600 hover:bg-amber-50 hover:text-amber-700 rounded-lg transition-colors group">
                        <UploadCloud size={16} className="text-slate-400 group-hover:text-amber-500" />
                        <span>อัปโหลดยอดคงเหลือ (Excel)</span>
                        <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>



          {/* Table (Extracted Component) */}
          <EquipmentListTable 
            items={data}
            loading={loading}
            searchTerm={searchTerm}
            calibratedInventory={calibratedInventory}
            onEdit={setEditItem}
          />
        </>
      )}

      {activeTab === "CATEGORY" && (
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2 m-0">
              <Layers className="text-indigo-600" />
              ลงทะเบียนหมวดหมู่อุปกรณ์
            </h2>
            <button 
              type="button"
              onClick={() => {
                setShowPreviewModal(true);
              }}
              className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-2.5 rounded-xl hover:bg-indigo-100 transition-all font-semibold text-sm shadow-sm"
            >
              <Eye size={16} />
              ดูตัวอย่าง & ส่งออก (Preview / Export)
            </button>
          </div>

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
                <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Code</th>
                        <th className="px-4 py-2 font-semibold">Name</th>
                        <th className="px-4 py-2 font-semibold text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[...categories].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })).map(c => (
                        <tr key={c.code} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-mono text-indigo-600 font-semibold">{c.code}</td>
                          <td className="px-4 py-2">{c.name}</td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => setEditCategory(c)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium mr-2">Edit</button>
                            <button onClick={() => handleDeleteCategory(c.code)} className="text-rose-600 hover:text-rose-800 text-xs font-medium">Delete</button>
                          </td>
                        </tr>
                      ))}
                      {categories.length === 0 && (
                        <tr><td colSpan={3} className="px-4 py-4 text-center text-slate-400">ยังไม่มีข้อมูล</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sub Category Form */}
            <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
              <h3 className="font-medium text-slate-800 mb-4">เพิ่มหมวดย่อย (Sub Category)</h3>
              <form onSubmit={handleAddSubCategory} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">เลือกหมวดหลัก (Main Category)</label>
                  <select required value={newSubCatParent} onChange={e => setNewSubCatParent(e.target.value)} className="w-full px-3 py-2 border rounded-lg bg-white">
                    <option value="">-- เลือก --</option>
                    {[...categories].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })).map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">รหัสหมวดย่อย (Code)</label>
                  <input type="text" required value={newSubCatCode} onChange={e => setNewSubCatCode(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">ชื่อหมวดย่อย (Name)</label>
                  <input type="text" required value={newSubCatName} onChange={e => setNewSubCatName(e.target.value)} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <button type="submit" className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm">
                  บันทึกหมวดย่อย
                </button>
              </form>
              
              <div className="mt-8">
                <h4 className="text-sm font-medium text-slate-600 mb-3 border-b pb-2">หมวดย่อยในระบบ</h4>
                <div className="overflow-x-auto bg-white rounded-lg border border-slate-200 max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Code</th>
                        <th className="px-4 py-2 font-semibold">Name</th>
                        <th className="px-4 py-2 font-semibold text-right">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[...subCategories].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })).map(s => (
                        <tr key={s.code} className="hover:bg-slate-50">
                          <td className="px-4 py-2 font-mono text-indigo-600 font-semibold">{s.code}</td>
                          <td className="px-4 py-2">{s.name} <span className="text-xs text-slate-400">({s.category_code})</span></td>
                          <td className="px-4 py-2 text-right">
                            <button onClick={() => setEditSubCategory(s)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium mr-2">Edit</button>
                            <button onClick={() => handleDeleteSubCategory(s.code)} className="text-rose-600 hover:text-rose-800 text-xs font-medium">Delete</button>
                          </td>
                        </tr>
                      ))}
                      {subCategories.length === 0 && (
                        <tr><td colSpan={3} className="px-4 py-4 text-center text-slate-400">ยังไม่มีข้อมูล</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">Edit Equipment</h3>
              <button onClick={() => setEditItem(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
            </div>
            <form onSubmit={handleEditSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Item Code</label>
                  <input type="text" value={editItem.item_code} disabled className="w-full px-3 py-2 border rounded-lg bg-slate-100 text-slate-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Name</label>
                  <input type="text" value={editItem.name} onChange={e => setEditItem({...editItem, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Category (หมวดหลัก)</label>
                  <select 
                    value={editItem.category_code} 
                    onChange={e => setEditItem({...editItem, category_code: e.target.value, sub_category_code: ""})} 
                    className="w-full px-3 py-2 border rounded-lg bg-white" 
                    required
                  >
                    <option value="">-- เลือก --</option>
                    {[...categories].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })).map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Sub-Category (หมวดย่อย)</label>
                  <select 
                    value={editItem.sub_category_code} 
                    onChange={e => setEditItem({...editItem, sub_category_code: e.target.value})} 
                    className="w-full px-3 py-2 border rounded-lg bg-white" 
                    required
                    disabled={!editItem.category_code}
                  >
                    <option value="">-- เลือก --</option>
                    {[...subCategories]
                      .filter(s => s.category_code === editItem.category_code)
                      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
                      .map(s => <option key={s.code} value={s.code}>{s.code} - {s.name}</option>)
                    }
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Unit</label>
                  <input type="text" value={editItem.unit} onChange={e => setEditItem({...editItem, unit: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Lead Time</label>
                  <input type="text" value={editItem.lead_time || ""} onChange={e => setEditItem({...editItem, lead_time: e.target.value})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Buy Price</label>
                  <input type="number" value={editItem.buy_price} onChange={e => setEditItem({...editItem, buy_price: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">Rent Price</label>
                  <input type="number" value={editItem.rent_price} onChange={e => setEditItem({...editItem, rent_price: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-indigo-700 mb-1">Remaining Stock (ยอดคงเหลือ)</label>
                  <input type="number" value={editItem.remaining_stock} onChange={e => setEditItem({...editItem, remaining_stock: parseInt(e.target.value) || 0})} className="w-full px-3 py-2 border-2 border-indigo-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-lg font-semibold text-indigo-900" />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setEditItem(null)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inventory Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800">Calibration: นำเข้ายอดสต็อก</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">เลือก Cycle ที่ต้องการสอบทาน (Calibrate)</label>
                <select 
                  value={selectedCycleForUpload} 
                  onChange={e => setSelectedCycleForUpload(e.target.value)} 
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                >
                  <option value="">-- กรุณาเลือก Cycle --</option>
                  {cycles.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.cycle_number} ({c.name})
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-slate-500 italic">
                  * ข้อมูลที่นำเข้าจะกลายเป็นยอดตั้งต้น (Baseline) ของ Cycle นี้ทันที
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <input 
                  type="file" 
                  accept=".xlsx,.xls" 
                  className="hidden" 
                  ref={inventoryInputRef} 
                  onChange={handleInventoryUpload} 
                />
                <button 
                  onClick={() => inventoryInputRef.current?.click()}
                  disabled={!selectedCycleForUpload || inventoryUploading}
                  className="w-full py-4 bg-amber-600 text-white rounded-xl hover:bg-amber-500 transition-all font-semibold flex items-center justify-center gap-2 shadow-lg shadow-amber-200 disabled:opacity-50 disabled:shadow-none"
                >
                  {inventoryUploading ? <Loader2 className="animate-spin" size={20} /> : <UploadCloud size={20} />}
                  เลือกไฟล์และเริ่มนำเข้าข้อมูล
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Edit Modal */}
      {editCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Edit Category</h3>
              <button onClick={() => setEditCategory(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
            </div>
            <form onSubmit={handleEditCategorySave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Code</label>
                <input type="text" value={editCategory.code} disabled className="w-full px-3 py-2 border rounded-lg bg-slate-100 text-slate-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Name</label>
                <input type="text" value={editCategory.name} onChange={e => setEditCategory({...editCategory, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setEditCategory(null)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors text-sm">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors text-sm">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SubCategory Edit Modal */}
      {editSubCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Edit Sub-Category</h3>
              <button onClick={() => setEditSubCategory(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
            </div>
            <form onSubmit={handleEditSubCategorySave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Code</label>
                <input type="text" value={editSubCategory.code} disabled className="w-full px-3 py-2 border rounded-lg bg-slate-100 text-slate-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Name</label>
                <input type="text" value={editSubCategory.name} onChange={e => setEditSubCategory({...editSubCategory, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg" required />
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setEditSubCategory(null)} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors text-sm">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors text-sm">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Preview / Export Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 animate-in fade-in duration-200">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-bold text-slate-800">ผังหมวดหมู่และหมวดย่อยอุปกรณ์ (Category Tree Preview)</h3>
                <p className="text-xs text-slate-500 mt-1">ดูโครงสร้างของหมวดหมู่หลัก หมวดย่อย และตรวจสอบรหัส</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowPreviewModal(false)} 
                className="text-slate-400 hover:text-slate-600 font-bold text-xl px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                &times;
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              {/* Top actions */}
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewCatCode(getNextCategoryCode());
                      setPreviewCatName("");
                      setShowAddCatModal(true);
                    }}
                    className="flex items-center gap-1.5 bg-indigo-600 text-white px-3.5 py-2 rounded-lg hover:bg-indigo-700 transition-all font-semibold text-xs shadow-sm"
                  >
                    <Plus size={14} />
                    เพิ่มหมวดหลัก
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleExportCategories}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-all font-semibold text-xs shadow-sm"
                >
                  <Download size={14} />
                  ส่งออกเป็น Excel
                </button>
              </div>

              {/* Tree view list */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-inner max-h-[50vh] overflow-y-auto custom-scrollbar">
                {categories.length === 0 ? (
                  <div className="p-12 text-center text-slate-400">ยังไม่มีหมวดหมู่หลักในระบบ</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {[...categories].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })).map(cat => {
                      const isExpanded = expandedCategories[cat.code] !== false; // Default expanded
                      const subItems = subCategories.filter(s => s.category_code === cat.code);

                      return (
                        <div key={cat.code} className="bg-white">
                          {/* Main Category Row */}
                          <div 
                            onClick={() => toggleCategoryExpand(cat.code)}
                            className="flex items-center justify-between p-4 hover:bg-indigo-50/20 cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono bg-indigo-100 text-indigo-700 font-bold px-2.5 py-1 rounded-md text-xs">{cat.code}</span>
                              <span className="font-bold text-slate-800 text-sm">{cat.name}</span>
                              <span className="text-[10px] text-slate-400">({subItems.length} หมวดย่อย)</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevent toggling category expansion
                                  setPreviewSubCatParent(cat.code);
                                  setPreviewSubCatCode(getNextSubCategoryCode(cat.code));
                                  setPreviewSubCatName("");
                                  setShowAddSubCatModal(true);
                                }}
                                className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md text-[10px] font-semibold border border-indigo-100 transition-colors"
                              >
                                <Plus size={10} />
                                เพิ่มหมวดย่อย
                              </button>
                              <ChevronDown size={16} className={`text-slate-400 transition-transform ${isExpanded ? "rotate-0" : "-rotate-90"}`} />
                            </div>
                          </div>

                          {/* Nested Sub-Categories */}
                          {isExpanded && (
                            <div className="bg-slate-50/50 pl-8 pr-4 pb-2 border-t border-slate-50 divide-y divide-slate-100">
                              {subItems.length === 0 ? (
                                <div className="py-3 text-xs text-slate-400 italic">ไม่มีหมวดย่อยในหมวดนี้</div>
                              ) : (
                                [...subItems].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })).map(sub => {
                                  const eqCount = getSubCategoryEquipmentCount(sub.code);
                                  const subEqItems = data.filter(item => item.sub_category_code === sub.code);
                                  const isSubExpanded = expandedSubCategories[sub.code] === true;

                                  return (
                                    <div key={sub.code} className="py-2 border-b last:border-b-0">
                                      {/* Sub-Category Header Row */}
                                      <div 
                                        onClick={() => toggleSubCategoryExpand(sub.code)}
                                        className="flex items-center justify-between py-2 cursor-pointer hover:bg-slate-100/50 px-2 rounded-lg transition-colors"
                                      >
                                        <div className="flex items-center gap-2">
                                          <ChevronDown size={12} className={`text-slate-400 transition-transform ${isSubExpanded ? "rotate-0" : "-rotate-90"}`} />
                                          <span className="font-mono text-xs text-indigo-500 font-semibold">{sub.code}</span>
                                          <span className="text-slate-700 text-xs font-medium">{sub.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation(); // Prevent toggling sub-category expansion
                                              setSelectedSubForAddEq(sub);
                                              setNewEqCode(getNextEquipmentCode(sub.code));
                                              setNewEqName("");
                                              setNewEqUnit("ชิ้น");
                                              setNewEqBuyPrice(0);
                                              setNewEqRentPrice(0);
                                              setNewEqLeadTime("30 วัน");
                                              setNewEqStock(0);
                                              setShowAddEqModal(true);
                                            }}
                                            className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-[10px] font-semibold border border-emerald-100 transition-colors"
                                          >
                                            <Plus size={10} />
                                            เพิ่มอุปกรณ์
                                          </button>
                                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${eqCount > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-400 border-slate-200"}`}>
                                            {eqCount} อุปกรณ์
                                          </span>
                                        </div>
                                      </div>

                                      {/* Equipment Items List */}
                                      {isSubExpanded && (
                                        <div className="pl-6 pr-4 py-1.5 bg-white divide-y divide-slate-100 border-l border-indigo-100 ml-4 space-y-1 my-1">
                                          {subEqItems.length === 0 ? (
                                            <div className="text-[10px] text-slate-400 italic py-1">ไม่มีรายการอุปกรณ์ในหมวดย่อยนี้</div>
                                          ) : (
                                            subEqItems.map(item => (
                                              <div key={item.id} className="flex justify-between items-center py-2.5 text-xs hover:bg-slate-50 px-2 rounded-md">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-mono text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">{item.item_code}</span>
                                                  <span className="text-slate-700 font-medium text-xs">{item.name}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                  <span className="text-slate-400 text-[10px]">หน่วย: {item.unit}</span>
                                                  <span className="text-indigo-600 font-semibold text-[10px]">฿{item.buy_price.toLocaleString()}</span>
                                                </div>
                                              </div>
                                            ))
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex justify-end bg-slate-50 shrink-0">
              <button 
                type="button" 
                onClick={() => setShowPreviewModal(false)} 
                className="px-5 py-2 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition-colors text-sm"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal (stacked) */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-md font-bold text-slate-800">เพิ่มหมวดหลักใหม่</h3>
              <button 
                type="button"
                onClick={() => setShowAddCatModal(false)} 
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddCatFromPreview} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">รหัสหมวดหลัก (Code Suggestion)</label>
                <input 
                  type="text" 
                  value={previewCatCode} 
                  onChange={e => setPreviewCatCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 text-indigo-600 font-bold font-mono focus:bg-white" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">ชื่อหมวดหลัก (เช่น เครื่องจักร)</label>
                <input 
                  type="text" 
                  value={previewCatName} 
                  onChange={e => setPreviewCatName(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" 
                  placeholder="กรอกชื่อหมวดหลัก..."
                  required 
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowAddCatModal(false)} 
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg text-xs"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-indigo-600 text-white font-semibold hover:bg-indigo-700 rounded-lg text-xs shadow-sm"
                >
                  บันทึกหมวดหลัก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Sub Category Modal (stacked) */}
      {showAddSubCatModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-md font-bold text-slate-800">เพิ่มหมวดย่อยใหม่</h3>
              <button 
                type="button"
                onClick={() => setShowAddSubCatModal(false)} 
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddSubCatFromPreview} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">เลือกหมวดหลัก (Main Category)</label>
                <select 
                  value={previewSubCatParent} 
                  onChange={e => {
                    const parent = e.target.value;
                    setPreviewSubCatParent(parent);
                    setPreviewSubCatCode(parent ? getNextSubCategoryCode(parent) : "");
                  }} 
                  className="w-full px-3 py-2 border rounded-lg bg-white" 
                  required
                >
                  <option value="">-- เลือก --</option>
                  {[...categories].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })).map(c => (
                    <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">รหัสหมวดย่อย (Code Suggestion)</label>
                <input 
                  type="text" 
                  value={previewSubCatCode} 
                  onChange={e => setPreviewSubCatCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 text-indigo-600 font-bold font-mono focus:bg-white" 
                  required 
                  disabled={!previewSubCatParent}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">ชื่อหมวดย่อย (เช่น รถขุด)</label>
                <input 
                  type="text" 
                  value={previewSubCatName} 
                  onChange={e => setPreviewSubCatName(e.target.value)} 
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" 
                  placeholder="กรอกชื่อหมวดย่อย..."
                  required 
                  disabled={!previewSubCatParent}
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowAddSubCatModal(false)} 
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg text-xs"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-indigo-600 text-white font-semibold hover:bg-indigo-700 rounded-lg text-xs shadow-sm"
                  disabled={!previewSubCatParent}
                >
                  บันทึกหมวดย่อย
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Equipment Modal (stacked) */}
      {showAddEqModal && selectedSubForAddEq && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-md font-bold text-slate-800">เพิ่มอุปกรณ์ใหม่</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">หมวด: {selectedSubForAddEq.category_code} / {selectedSubForAddEq.name}</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddEqModal(false)} 
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleAddEquipmentFromPreview} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">รหัสอุปกรณ์ (Code Suggestion)</label>
                  <input 
                    type="text" 
                    value={newEqCode} 
                    onChange={e => setNewEqCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 text-indigo-600 font-bold font-mono focus:bg-white" 
                    required 
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">ชื่ออุปกรณ์</label>
                  <input 
                    type="text" 
                    value={newEqName} 
                    onChange={e => setNewEqName(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" 
                    placeholder="กรอกชื่ออุปกรณ์..."
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">หน่วย (Unit)</label>
                  <input 
                    type="text" 
                    value={newEqUnit} 
                    onChange={e => setNewEqUnit(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-lg"
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Lead Time</label>
                  <input 
                    type="text" 
                    value={newEqLeadTime} 
                    onChange={e => setNewEqLeadTime(e.target.value)} 
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">ราคาซื้อ (Buy Price)</label>
                  <input 
                    type="number" 
                    value={newEqBuyPrice} 
                    onChange={e => setNewEqBuyPrice(parseInt(e.target.value) || 0)} 
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">ราคาเช่า (Rent Price)</label>
                  <input 
                    type="number" 
                    value={newEqRentPrice} 
                    onChange={e => setNewEqRentPrice(parseInt(e.target.value) || 0)} 
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">ยอดคงเหลือในคลัง (Remaining Stock)</label>
                  <input 
                    type="number" 
                    value={newEqStock} 
                    onChange={e => setNewEqStock(parseInt(e.target.value) || 0)} 
                    className="w-full px-3 py-2 border-2 border-indigo-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg font-semibold text-indigo-900"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setShowAddEqModal(false)} 
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg text-xs"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-indigo-600 text-white font-semibold hover:bg-indigo-700 rounded-lg text-xs shadow-sm"
                >
                  บันทึกอุปกรณ์
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {inventoryUploading && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 transition-all duration-300">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-slate-100/50 flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative flex items-center justify-center w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl animate-pulse">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
            </div>
            <div className="text-center space-y-2">
              <h4 className="text-lg font-bold text-slate-800">กำลังอัปเดตยอดคงเหลือคลังสินค้า...</h4>
              <p className="text-sm text-slate-500">กรุณารอสักครู่ ระบบกำลังนำเข้าข้อมูลยอดคงเหลือเข้าฐานข้อมูล</p>
            </div>
            <div className="w-full space-y-2">
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${inventoryUploadProgress.total > 0 ? (inventoryUploadProgress.current / inventoryUploadProgress.total) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                <span>สำเร็จ {inventoryUploadProgress.current} จาก {inventoryUploadProgress.total} รายการ</span>
                <span>
                  {inventoryUploadProgress.total > 0 
                    ? Math.round((inventoryUploadProgress.current / inventoryUploadProgress.total) * 100) 
                    : 0}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
