import ProjectManagement from "@/components/admin/ProjectManagement";
export default function AdminProjectsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        <ProjectManagement />
      </main>
    </div>
  );
}
