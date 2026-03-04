import React, { useCallback } from 'react';
import { useToastStore } from '../stores';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const iconMap = {
  success: <CheckCircle size={18} className="text-emerald-600 shrink-0" />,
  error: <XCircle size={18} className="text-rose-600 shrink-0" />,
  info: <Info size={18} className="text-blue-600 shrink-0" />,
  warning: <AlertTriangle size={18} className="text-amber-600 shrink-0" />,
};

const bgMap = {
  success: 'bg-emerald-50 border-emerald-200/60 dark:bg-emerald-950/80 dark:border-emerald-800/60',
  error: 'bg-rose-50 border-rose-200/60 dark:bg-rose-950/80 dark:border-rose-800/60',
  info: 'bg-blue-50 border-blue-200/60 dark:bg-blue-950/80 dark:border-blue-800/60',
  warning: 'bg-amber-50 border-amber-200/60 dark:bg-amber-950/80 dark:border-amber-800/60',
};

export const ToastContainer: React.FC = () => {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  // Pause auto-dismiss on hover (extend by re-setting timeout)
  const handleMouseEnter = useCallback((id: string) => {
    // Store the ID so we know it's being hovered
    (window as unknown as Record<string, boolean>)[`toast_hover_${id}`] = true;
  }, []);

  const handleMouseLeave = useCallback((id: string) => {
    delete (window as unknown as Record<string, boolean>)[`toast_hover_${id}`];
    // Re-set a shorter timeout after leaving hover
    setTimeout(() => {
      if (!(window as unknown as Record<string, boolean>)[`toast_hover_${id}`]) {
        removeToast(id);
      }
    }, 2000);
  }, [removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          aria-live="polite"
          aria-atomic="true"
          onMouseEnter={() => handleMouseEnter(toast.id)}
          onMouseLeave={() => handleMouseLeave(toast.id)}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-premium-lg backdrop-blur-sm animate-slideIn ${bgMap[toast.type]}`}
        >
          {iconMap[toast.type]}
          <span className="text-sm text-slate-800 dark:text-slate-200 flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 shrink-0 transition"
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
