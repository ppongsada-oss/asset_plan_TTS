import EquipmentTable from "@/components/master-data/EquipmentTable";

export default function MasterDataPage() {
  return (
    <main className="min-h-screen bg-slate-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Master Data Management</h1>
          <p className="text-slate-500 mt-1">ระบบจัดการข้อมูลหลัก: อุปกรณ์ โครงการ และผู้ใช้งาน</p>
        </div>

        {/* Content Area */}
        <EquipmentTable />

      </div>
    </main>
  );
}
