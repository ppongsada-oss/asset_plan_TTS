'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: number) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

let idCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++idCounter;
    setToasts(prev => [...prev, { id, type, message }].slice(-5));
    setTimeout(() => removeToast(id), 4000);
  }, [removeToast]);

  return (
    React.createElement(ToastContext.Provider, { value: { toasts, addToast, removeToast } }, children)
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return {
    toast: {
      success: (msg: string) => ctx.addToast('success', msg),
      error: (msg: string) => ctx.addToast('error', msg),
      info: (msg: string) => ctx.addToast('info', msg),
    }
  };
}
