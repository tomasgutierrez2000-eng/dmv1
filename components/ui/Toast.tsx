'use client';

import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastMessage {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toast: (msg: Omit<ToastMessage, 'id'>) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let _globalId = 0;

const icons: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const colors: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: 'text-emerald-600',
    text: 'text-emerald-800',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
    text: 'text-red-800',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
    text: 'text-blue-800',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-600',
    text: 'text-amber-800',
  },
};

function ToastItem({ msg, onDismiss }: { msg: ToastMessage; onDismiss: (id: number) => void }) {
  const [exiting, setExiting] = useState(false);
  const Icon = icons[msg.type];
  const c = colors[msg.type];

  useEffect(() => {
    const dur = msg.duration ?? 4000;
    const fadeTimer = setTimeout(() => setExiting(true), dur - 300);
    const removeTimer = setTimeout(() => onDismiss(msg.id), dur);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, [msg, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex items-start gap-3 w-80 px-4 py-3 rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 ${c.bg} ${c.border} ${
        exiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      }`}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${c.icon}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${c.text}`}>{msg.title}</p>
        {msg.description && (
          <p className={`text-xs mt-0.5 ${c.text} opacity-80`}>{msg.description}</p>
        )}
      </div>
      <button
        onClick={() => onDismiss(msg.id)}
        className={`flex-shrink-0 p-0.5 rounded hover:bg-black/5 ${c.text} opacity-60 hover:opacity-100 transition-opacity`}
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((msg: Omit<ToastMessage, 'id'>) => {
    const id = ++_globalId;
    setToasts((prev) => [...prev.slice(-4), { ...msg, id }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast container - bottom right, like Google/Apple pattern */}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map((msg) => (
          <div key={msg.id} className="pointer-events-auto">
            <ToastItem msg={msg} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
