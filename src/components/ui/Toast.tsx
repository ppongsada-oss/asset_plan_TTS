'use client';
import { useContext } from 'react';
import { ToastContext } from '@/hooks/useToast';

const styles = {
  success: 'bg-green-50 border-green-400 text-green-800',
  error: 'bg-red-50 border-red-400 text-red-800',
  info: 'bg-blue-50 border-blue-400 text-blue-800',
};

const icons = { success: '✓', error: '✕', info: 'ℹ' };

export default function Toast() {
  const ctx = useContext(ToastContext);
  if (!ctx || ctx.toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {ctx.toasts.map(t => (
        <div
          key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-md min-w-[280px] max-w-[420px] pointer-events-auto animate-in slide-in-from-right-5 fade-in duration-300 ${styles[t.type]}`}
        >
          <span className="font-bold text-lg leading-none mt-0.5">{icons[t.type]}</span>
          <span className="text-sm flex-1">{t.message}</span>
          <button
            onClick={() => ctx.removeToast(t.id)}
            className="opacity-60 hover:opacity-100 text-lg leading-none ml-1"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
