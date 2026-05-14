"use client";
import Modal from "./Modal";
import { AlertCircle, CheckCircle, HelpCircle, AlertTriangle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "success" | "info";
  isLoading?: boolean;
  children?: React.ReactNode;
}

export default function ConfirmModal({ 
  isOpen, onClose, onConfirm, title, message, 
  confirmText = "Confirm", cancelText = "Cancel", 
  type = "info", isLoading = false, children 
}: ConfirmModalProps) {
  
  const colors = {
    danger: "bg-rose-50 text-rose-600 border-rose-100",
    warning: "bg-amber-50 text-amber-600 border-amber-100",
    success: "bg-emerald-50 text-emerald-600 border-emerald-100",
    info: "bg-indigo-50 text-indigo-600 border-indigo-100"
  };

  const icons = {
    danger: <AlertCircle className="text-rose-600" size={32} />,
    warning: <AlertTriangle className="text-amber-600" size={32} />,
    success: <CheckCircle className="text-emerald-600" size={32} />,
    info: <HelpCircle className="text-indigo-600" size={32} />
  };

  const btnColors = {
    danger: "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30",
    warning: "bg-amber-600 hover:bg-amber-700 shadow-amber-600/30",
    success: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30",
    info: "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30"
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col items-center text-center">
        <div className={`p-5 rounded-3xl ${colors[type].split(' ')[0]} mb-6 shadow-inner`}>
          {icons[type]}
        </div>
        <div className="space-y-2 mb-8">
          <p className="text-slate-800 font-semibold text-lg">{message}</p>
          <p className="text-slate-500 text-sm leading-relaxed">การดำเนินการนี้จะมีผลต่อระบบทันที กรุณาตรวจสอบข้อมูลให้ครบถ้วน</p>
        </div>
        
        {children && <div className="w-full mb-8 text-left">{children}</div>}

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button 
            disabled={isLoading}
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button 
            disabled={isLoading}
            onClick={onConfirm}
            className={`flex-1 px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all shadow-lg active:scale-95 ${btnColors[type]} disabled:opacity-50`}
          >
            {isLoading ? "กำลังประมวลผล..." : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
