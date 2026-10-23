import React from 'react';
import { Info, CheckCircle2, Zap } from 'lucide-react';

export default function ToastContainer({ toasts }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container" aria-live="polite">
      {toasts.map(toast => {
        let Icon = Info;
        if (toast.type === 'success') Icon = CheckCircle2;
        if (toast.type === 'alert') Icon = Zap;

        return (
          <div key={toast.id} className="toast">
            <Icon size={20} className={toast.type === 'alert' ? 'text-amber-400' : toast.type === 'success' ? 'text-emerald-400' : 'text-indigo-400'} />
            <div style={{ fontSize: '0.84rem', fontWeight: 500 }}>
              {toast.message}
            </div>
          </div>
        );
      })}
    </div>
  );
}
