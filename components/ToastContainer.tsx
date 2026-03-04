import React from 'react';
import { useToast } from '../store';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const iconMap = {
  success: <CheckCircle size={18} className="text-emerald-600 shrink-0" />,
  error: <XCircle size={18} className="text-rose-600 shrink-0" />,
  info: <Info size={18} className="text-blue-600 shrink-0" />,
  warning: <AlertTriangle size={18} className="text-amber-600 shrink-0" />,
};

const bgMap = {
  success: 'bg-emerald-50 border-emerald-200/60',
  error: 'bg-rose-50 border-rose-200/60',
  info: 'bg-blue-50 border-blue-200/60',
  warning: 'bg-amber-50 border-amber-200/60',
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border shadow-premium-lg backdrop-blur-sm animate-slideIn ${bgMap[toast.type]}`}
        >
          {iconMap[toast.type]}
          <span className="text-sm text-slate-800 flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-slate-600 shrink-0 transition"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
