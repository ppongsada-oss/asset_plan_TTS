"use client";

import { useState, useEffect } from "react";
import { UserPlus, Shield, Trash2, ArrowLeft, Search, Check, X } from "lucide-react";
import Link from "next/link";

type User = { id: number; email: string; global_role: string };
type ProjectRole = { id: number; project_id: string; role: string; user_id: number; email: string };

export default function ProjectRolesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<ProjectRole[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ user_id: "", role: "STORE_SITE" });
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [projectSearch, setProjectSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, projectsRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/projects/roles"),
        fetch("/api/projects")
      ]);
      const usersData = await usersRes.json();
      const rolesData = await rolesRes.json();
      const projectsData = await projectsRes.json();

      if (usersData.success) setUsers(usersData.data);
      if (rolesData.success) setRoles(rolesData.data);
      if (projectsData.success) setProjects(projectsData.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.user_id || selectedProjectIds.length === 0 || !form.role) return;

    setSubmitting(true);
    try {
      // API only supports single assignment, so we loop
      for (const pid of selectedProjectIds) {
        await fetch("/api/projects/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: parseInt(form.user_id),
            project_id: pid,
            role: form.role,
          })
        });
      }
      
      setForm({ user_id: "", role: "STORE_SITE" });
      setSelectedProjectIds([]);
      setProjectSearch("");
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Failed to assign some roles");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.id.toLowerCase().includes(projectSearch.toLowerCase()) || 
    p.name.toLowerCase().includes(projectSearch.toLowerCase())
  );

  const toggleProject = (pid: string) => {
    setSelectedProjectIds(prev => 
      prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]
    );
  };

  const selectAllFiltered = () => {
    const allFilteredIds = filteredProjects.map(p => p.id);
    setSelectedProjectIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
  };

  const deselectAllFiltered = () => {
    const allFilteredIds = filteredProjects.map(p => p.id);
    setSelectedProjectIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
  };

  const handleDelete = async (ids: number[]) => {
    if (!confirm("Are you sure? This will remove access to all listed projects for this user/role.")) return;
    try {
      for (const id of ids) {
        await fetch(`/api/projects/roles?id=${id}`, { method: "DELETE" });
      }
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const groupedRoles = roles.reduce((acc, curr) => {
    const key = `${curr.user_id}-${curr.role}`;
    if (!acc[key]) {
      acc[key] = {
        user_id: curr.user_id,
        email: curr.email,
        role: curr.role,
        project_ids: [],
        ids: []
      };
    }
    acc[key].project_ids.push(curr.project_id);
    acc[key].ids.push(curr.id);
    return acc;
  }, {} as Record<string, { user_id: number; email: string; role: string; project_ids: string[]; ids: number[] }>);

  const rolesToDisplay = Object.values(groupedRoles);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2 flex items-center gap-3">
              <Shield className="text-indigo-600" size={32} />
              Project Access Control
            </h1>
            <p className="text-slate-500">Manage specific user roles and permissions for each project.</p>
          </div>
          <Link href="/admin/users" className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-medium">
             <ArrowLeft size={18} /> Global Users
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Form */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm sticky top-24">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <UserPlus size={20} className="text-indigo-600" />
                Assign New Role
              </h2>
              <form onSubmit={handleAssign} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Select User</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    value={form.user_id}
                    onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                    required
                  >
                    <option value="">Choose a user...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.email}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 flex justify-between items-center">
                    Project Identifier
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                      {selectedProjectIds.length} selected
                    </span>
                  </label>
                  
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none placeholder-slate-400 transition-all"
                        placeholder="Search projects..."
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-2 mb-2">
                      <button 
                        type="button" 
                        onClick={selectAllFiltered}
                        className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-700"
                      >
                        Select All
                      </button>
                      <span className="text-slate-300 text-[10px]">|</span>
                      <button 
                        type="button" 
                        onClick={deselectAllFiltered}
                        className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-500"
                      >
                        Clear
                      </button>
                    </div>

                    <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-xl p-1 bg-slate-50/30 scrollbar-thin scrollbar-thumb-slate-200">
                      {filteredProjects.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 italic">No projects found</div>
                      ) : (
                        <div className="grid grid-cols-1 gap-1">
                          {filteredProjects.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => toggleProject(p.id)}
                              className={`flex items-center justify-between p-2.5 rounded-lg text-left transition-all ${
                                selectedProjectIds.includes(p.id) 
                                ? 'bg-white border-indigo-200 shadow-sm text-indigo-700 ring-1 ring-indigo-100' 
                                : 'hover:bg-white text-slate-600 border-transparent'
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-bold">{p.id}</span>
                                <span className="text-[10px] text-slate-400 truncate max-w-[140px]">{p.name}</span>
                              </div>
                              {selectedProjectIds.includes(p.id) && <Check size={14} className="text-indigo-600" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Assign Role</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="STORE_SITE">Store Site (ผู้กรอกแผน)</option>
                    <option value="PROJECT_MANAGER">Project Manager (ผู้อนุมัติ)</option>
                    <option value="VIEWER">Viewer (ผู้ดูอย่างเดียว)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={submitting || selectedProjectIds.length === 0}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:shadow-none text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Confirm Assignment"
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: List */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-800">Current Assignments</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-slate-400 text-xs uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold border-b border-slate-100">User Account</th>
                      <th className="px-6 py-4 font-semibold border-b border-slate-100">Project</th>
                      <th className="px-6 py-4 font-semibold border-b border-slate-100">Role</th>
                      <th className="px-6 py-4 font-semibold border-b border-slate-100 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rolesToDisplay.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No roles assigned to projects yet.</td>
                      </tr>
                    ) : (
                      rolesToDisplay.map((r) => (
                        <tr key={`${r.user_id}-${r.role}`} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="text-slate-900 font-medium">{r.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1 max-w-[220px]" title={r.project_ids.join(', ')}>
                              {r.project_ids.slice(0, 3).map((pid) => (
                                <span key={pid} className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-indigo-100 whitespace-nowrap">
                                  {pid}
                                </span>
                              ))}
                              {r.project_ids.length > 3 && (
                                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 whitespace-nowrap cursor-help">
                                  +{r.project_ids.length - 3} more
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                              r.role === 'PROJECT_MANAGER' ? 'bg-amber-100 text-amber-700' :
                              r.role === 'STORE_SITE' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {r.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDelete(r.ids)}
                              className="text-slate-400 hover:text-rose-600 p-2 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
