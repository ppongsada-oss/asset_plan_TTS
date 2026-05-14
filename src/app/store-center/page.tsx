import StoreCenterTabs from "@/components/store-center/StoreCenterTabs";
import { Factory } from "lucide-react";

export default function StoreCenterPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-[1400px] mx-auto">
        
        {/* Page Context Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <Factory size={24} />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">คลังสินค้ากลาง (Central Warehouse)</h1>
            </div>
            <p className="text-slate-500 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-slate-300"></span>
              Role: <strong>Store Center</strong> (ผู้รวบรวมแผนและจัดหา)
            </p>
          </div>
        </div>

        {/* Tabbed Interface */}
        <StoreCenterTabs />

      </div>
    </main>
  );
}
