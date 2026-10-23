import { AlertTriangle, X, ArrowRight } from 'lucide-react';

interface NotificationModalProps {
  open: boolean;
  onClose: () => void;
  onAction: () => void;
  title: string;
  message: string;
  actionLabel: string;
}

export default function NotificationModal({
  open,
  onClose,
  onAction,
  title,
  message,
  actionLabel,
}: NotificationModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl animate-fade-in">
        <div className="flex items-start justify-between p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/10">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{title}</h2>
              <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">{message}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={() => {
              onAction();
              onClose();
            }}
            className="flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-500"
          >
            {actionLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
