import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  timestamp: number;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      id="global-toast-container"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastCard: React.FC<{
  toast: ToastItem;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: 'bg-slate-900 border-emerald-500/40 text-emerald-300',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
          accent: 'bg-emerald-500',
          badge: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/60',
          defaultTitle: 'Success',
        };
      case 'warning':
        return {
          bg: 'bg-slate-900 border-amber-500/40 text-amber-300',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
          accent: 'bg-amber-500',
          badge: 'text-amber-400 bg-amber-950/60 border-amber-800/60',
          defaultTitle: 'Warning',
        };
      case 'info':
        return {
          bg: 'bg-slate-900 border-blue-500/40 text-blue-300',
          icon: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
          accent: 'bg-blue-500',
          badge: 'text-blue-400 bg-blue-950/60 border-blue-800/60',
          defaultTitle: 'Notice',
        };
      case 'error':
      default:
        return {
          bg: 'bg-slate-900 border-rose-500/40 text-rose-300',
          icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
          accent: 'bg-rose-500',
          badge: 'text-rose-400 bg-rose-950/60 border-rose-800/60',
          defaultTitle: 'Error',
        };
    }
  };

  const style = getStyles();

  return (
    <div
      id={`toast-${toast.id}`}
      className={`pointer-events-auto w-full rounded-xl border shadow-xl backdrop-blur-md p-4 transition-all duration-200 transform translate-y-0 opacity-100 flex items-start gap-3 relative overflow-hidden ${style.bg}`}
      role="alert"
    >
      {/* Accent left indicator */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.accent}`} />

      {/* Icon */}
      <div className="mt-0.5">{style.icon}</div>

      {/* Message content */}
      <div className="flex-1 pr-2 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-slate-200">
            {toast.title || style.defaultTitle}
          </span>
          <span className="text-[10px] text-slate-400">
            {new Date(toast.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed break-words">
          {toast.message}
        </p>
      </div>

      {/* Dismiss Button */}
      <button
        id={`toast-dismiss-${toast.id}`}
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition shrink-0 cursor-pointer"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
