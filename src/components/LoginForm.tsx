"use client";

import { Lock, Mail, ArrowRight, Building2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      
      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        throw new Error("ระบบตอบกลับผิดพลาด (Non-JSON)");
      }
      
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      } else {
        router.push("/");
      }
    } catch (err) {
      setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden">
      {/* Decorative Gradient Blob */}
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
      
      <div className="text-center mb-8">
        <div className="mx-auto bg-indigo-500/20 text-indigo-400 p-3 rounded-full inline-block mb-4">
          <Building2 size={32} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Asset Plan</h1>
        <p className="text-slate-400 text-sm">เข้าสู่ระบบเพื่อจัดการทรัพย์สินโครงการ</p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-sm text-center">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email (ชื่อผู้ใช้)</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Mail size={18} />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300"
              placeholder="admin@tts-construction.com"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password (รหัสผ่าน)</label>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Lock size={18} />
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-300"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="group relative w-full flex justify-center items-center gap-2 py-3.5 px-4 font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
        >
          <span className="relative z-10">{isLoading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}</span>
          {!isLoading && <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />}
          
          {/* Hover effect Layer */}
          <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-white/5 flex flex-col gap-3">
        <div className="flex items-center justify-center gap-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <span className="h-px w-8 bg-white/5"></span>
          วิธีใช้งานระบบ
          <span className="h-px w-8 bg-white/5"></span>
        </div>
        <div className="flex gap-2">
          <a 
            href="/docs/manual/index.html" 
            target="_blank" 
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all text-xs"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
            คู่มือการใช้งาน (Manual)
          </a>
          <a 
            href="/docs/presentation/index.html" 
            target="_blank" 
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all text-xs"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
            แนะนำระบบ
          </a>
        </div>
      </div>

      <div className="mt-6 text-center text-[10px] text-slate-600">
        <p>Copyright © 2026 TTS Construction</p>
      </div>
    </div>
  );
}
