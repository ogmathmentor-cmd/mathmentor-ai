
import React, { useEffect } from 'react';
import { Toast as ToastType } from '../types';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

interface ToastProps {
  toasts: ToastType[];
  removeToast: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-2 w-full max-w-sm px-4">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastType; onClose: () => void }> = ({ toast, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    error: <AlertCircle size={18} className="text-red-500" />,
    success: <CheckCircle2 size={18} className="text-emerald-500" />,
    info: <Info size={18} className="text-indigo-500" />
  };

  const bgStyles = {
    error: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30',
    success: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30',
    info: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/30'
  };

  return (
    <div className={`flex items-center gap-3 p-4 rounded-2xl border shadow-xl animate-in slide-in-from-bottom-2 duration-300 ${bgStyles[toast.type]}`}>
      {icons[toast.type]}
      <p className="flex-1 text-xs font-bold text-slate-800 dark:text-slate-100">{toast.message}</p>
      <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
        <X size={14} />
      </button>
    </div>
  );
};

export default Toast;
