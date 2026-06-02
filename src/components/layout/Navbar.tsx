"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Database, Building2, LayoutDashboard, TableProperties, User, LogOut, Settings, ChevronDown, UserCheck } from "lucide-react";
import { useState, useEffect, useRef } from "react";

type UserPayload = {
  id: number;
  email: string;
  role: string;
  projectRoles: Record<string, string>;
};

export function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserPayload | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch logged-in user
    if (pathname !== "/" && pathname !== "/login") {
      fetch("/api/auth/me")
        .then((res) => {
          if (!res.ok) throw new Error("Unauthorized");
          return res.json();
        })
        .then((data: any) => {
          if (data.success && data.user) {
            setUser(data.user);
          }
        })
        .catch((err) => {
          console.error("Navbar Auth Check Failed", err);
          // Redirect to login if on protected page and auth fails
          if (pathname !== "/" && pathname !== "/login") {
            window.location.href = "/login";
          }
        });
    }
  }, [pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node | null)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  // Hide on main portal and login
  if (pathname === "/" || pathname === "/login") {
    return null;
  }

  const isAdmin = user?.role === "ADMIN";
  const isStoreCenter = user?.role === "STORE_CENTER" || isAdmin;
  const canApprove = isAdmin || (user?.projectRoles && Object.values(user.projectRoles).includes("PROJECT_MANAGER"));
  const canSeeMatrix = isAdmin || user?.role === "STORE_CENTER";

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/70 border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-6">
            <Link 
              href="/" 
              className="flex items-center gap-2.5 text-slate-900 hover:opacity-80 transition-opacity"
            >
              <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-1.5 rounded-xl text-white shadow-sm shadow-indigo-200">
                <Home size={18} />
              </div>
              <span className="font-black text-lg tracking-tight hidden sm:block bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                Asset Plan
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1 border-l border-slate-200 pl-4 ml-2">
              {/* Group 1: Inventory & Admin */}
              {isStoreCenter && (
                <>
                  <NavLink href="/admin/projects" icon={<Building2 size={16} />} label="Projects" current={pathname} />
                  <NavLink href="/master-data" icon={<Database size={16} />} label="Master Data" current={pathname} />
                  <NavLink href="/store-center" icon={<LayoutDashboard size={16} />} label="Store Center" current={pathname} />
                </>
              )}
              
              {/* Separator if needed */}
              {isStoreCenter && (
                <div className="h-4 w-px bg-slate-200 mx-2" />
              )}

              {/* Group 2: Operations */}
              {((user?.projectRoles && Object.keys(user.projectRoles).length > 0) || isAdmin || user?.role === "USER") && (
                <NavLink href="/site-plan" icon={<Building2 size={16} />} label="Store Site" current={pathname} />
              )}
              {canApprove && (
                <NavLink href="/site-plan/pm-approval" icon={<UserCheck size={16} />} label="Approval" current={pathname} />
              )}

              {/* Separator if needed */}
              {canSeeMatrix && <div className="h-4 w-px bg-slate-200 mx-2" />}

              {/* Group 3: Reporting */}
              {canSeeMatrix && (
                <NavLink href="/matrix-report" icon={<TableProperties size={16} />} label="Matrix" current={pathname} />
              )}
            </div>
          </div>

          {/* User Profile Dropdown */}
          {user && (
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-100 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  {user.email.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:flex flex-col items-start text-left">
                  <span className="text-sm font-medium text-slate-800 leading-none">{user.email}</span>
                  <span className="text-xs text-slate-500 mt-1">{user.role}</span>
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-100 py-1 overflow-hidden z-50">
                  {user.role === "ADMIN" && (
                    <>
                      <Link 
                        href="/admin/users"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 w-full"
                      >
                        <User size={16} /> Global Users
                      </Link>
                      <Link 
                        href="/admin/project-roles"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 w-full"
                      >
                        <Settings size={16} /> Project Roles
                      </Link>
                    </>
                  )}
                  <Link 
                    href="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 w-full"
                  >
                    <Settings size={16} /> Edit Profile
                  </Link>
                  <div className="h-px bg-slate-100 my-1"></div>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 w-full text-left"
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, icon, label, current }: { href: string; icon: React.ReactNode; label: string; current: string }) {
  const isActive = current?.startsWith(href);
  return (
    <Link 
      href={href}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-200 ${
        isActive 
          ? "bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100/50" 
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
