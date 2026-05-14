import Link from "next/link";
import { Database, LayoutDashboard, Building2, TableProperties, ArrowRight, UserCheck, ShieldCheck } from "lucide-react";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";

export default async function Home() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  
  let user: any = null;
  if (token) {
    user = await verifyToken(token);
  }

  const isAdmin = user?.role === "ADMIN";
  const isStoreCenter = user?.role === "STORE_CENTER" || isAdmin;
  
  // For now, let's show Approval card if Admin or if they have project roles 
  // (In a real app, we'd check if any project role is PROJECT_MANAGER)
  const canApprove = isAdmin || (user?.projectRoles && Object.values(user.projectRoles).includes("PROJECT_MANAGER"));

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-5xl w-full py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="mx-auto bg-indigo-100 text-indigo-600 p-4 rounded-3xl inline-block mb-6 shadow-md">
            <Building2 size={48} />
          </div>
          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
            Asset Plan System
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto">
            ระบบบริหารจัดการทรัพย์สินโครงการ TTS Construction <br/>
            <span className="text-sm font-medium text-slate-400 uppercase tracking-widest mt-4 block">
              Logged in as: <span className="text-indigo-600">{user?.email || "Guest"}</span> ({user?.role || "N/A"})
            </span>
          </p>
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Card 1: Master Data (Store Center/Admin) */}
          {isStoreCenter && (
            <>
              <Link href="/admin/projects" className="group bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Building2 size={100} />
                </div>
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Building2 size={28} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Projects</h2>
                <p className="text-slate-500 mb-8">จัดการรายชื่อไซต์งานและคลังสินค้า รวมถึงการปิด/Archive โครงการ</p>
                <div className="flex items-center text-indigo-600 font-semibold group-hover:gap-2 transition-all">
                  จัดการโครงการ <ArrowRight size={20} className="ml-1" />
                </div>
              </Link>

              <Link href="/master-data" className="group bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Database size={100} />
                </div>
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <ShieldCheck size={28} />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Master Data</h2>
                <p className="text-slate-500 mb-8">จัดการฐานข้อมูลอุปกรณ์ และตั้งค่ายอดคงเหลือของคลังสินค้ากลาง</p>
                <div className="flex items-center text-indigo-600 font-semibold group-hover:gap-2 transition-all">
                  เข้าสู่ระบบหลังบ้าน <ArrowRight size={20} className="ml-1" />
                </div>
              </Link>
            </>
          )}

          {/* Card 2: Store Site (Site Users Only) */}
          {((user?.projectRoles && Object.keys(user.projectRoles).length > 0) || isAdmin || user?.role === "USER") && (
            <Link href="/site-plan" className="group bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-300 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Building2 size={100} />
              </div>
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Building2 size={28} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Store Site</h2>
              <p className="text-slate-500 mb-8">สำหรับหน้างาน: บันทึกสต็อกคงเหลือ และร่างแผนความต้องการอุปกรณ์</p>
              <div className="flex items-center text-emerald-600 font-semibold group-hover:gap-2 transition-all">
                เข้าสู่หน้าจอไซต์งาน <ArrowRight size={20} className="ml-1" />
              </div>
            </Link>
          )}

          {/* Card: Project Approval (PM/Admin) */}
          {canApprove && (
            <Link href="/site-plan/pm-approval" className="group bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all duration-300 relative overflow-hidden border-l-4 border-l-amber-500">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <UserCheck size={100} />
              </div>
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <UserCheck size={28} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Project Approval</h2>
              <p className="text-slate-500 mb-8">สำหรับ PM: ตรวจสอบและอนุมัติแผนการใช้อุปกรณ์จาก Store Site</p>
              <div className="flex items-center text-amber-600 font-semibold group-hover:gap-2 transition-all">
                เข้าสู่หน้าอนุมัติ <ArrowRight size={20} className="ml-1" />
              </div>
            </Link>
          )}

          {/* Card 3: Store Center */}
          {isStoreCenter && (
            <Link href="/store-center" className="group bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-rose-300 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <LayoutDashboard size={100} />
              </div>
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <LayoutDashboard size={28} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Store Center</h2>
              <p className="text-slate-500 mb-8">สำหรับคลังกลาง: ตรวจสอบความต้องการ และตัดสินใจจัดหา (Buy/Rent)</p>
              <div className="flex items-center text-rose-600 font-semibold group-hover:gap-2 transition-all">
                เข้าสู่หน้าจอคลังกลาง <ArrowRight size={20} className="ml-1" />
              </div>
            </Link>
          )}

          {/* Card 4: Matrix Report (Store Center/Admin) */}
          {(isAdmin || user?.role === "STORE_CENTER") && (
            <Link href="/matrix-report" className="group bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-sky-300 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <TableProperties size={100} />
              </div>
              <div className="w-14 h-14 bg-sky-50 text-sky-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <TableProperties size={28} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Matrix Report</h2>
              <p className="text-slate-500 mb-8">ดูรายงานภาพรวมการกระจายอุปกรณ์ข้ามโครงการทั้งหมด</p>
              <div className="flex items-center text-sky-600 font-semibold group-hover:gap-2 transition-all">
                ดูรายงาน Matrix <ArrowRight size={20} className="ml-1" />
              </div>
            </Link>
          )}

        </div>
      </div>
    </div>
  );
}
