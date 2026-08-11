'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { Toast, ToastType } from '@/lib/types';
import { generateClientId } from '@/lib/utils';

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = generateClientId();
    setToasts(prev => [...prev, { id, type, message }]);
    const timer = setTimeout(() => removeToast(id), 5000);
    timers.current.set(id, timer);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastList toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

// ─── Toast List UI ────────────────────────────────────────────
const ICONS: Record<ToastType, string> = {
  success: '✓',
  error:   '✕',
  warning: '⚠',
  info:    'ℹ',
};

function ToastList({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container" role="region" aria-label="Notifications">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`toast toast-${t.type}`}
          onClick={() => onRemove(t.id)}
          role="alert"
          aria-live="polite"
        >
          <span style={{ fontSize: '1rem', flexShrink: 0, fontWeight: 700 }}>
            {ICONS[t.type]}
          </span>
          <span style={{ flex: 1 }}>{t.message}</span>
          <span style={{ fontSize: '0.75rem', opacity: 0.6, cursor: 'pointer', flexShrink: 0 }}>✕</span>
        </div>
      ))}
    </div>
  );
}
