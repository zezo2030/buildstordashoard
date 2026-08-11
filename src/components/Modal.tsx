import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { Btn } from './ui';

export function Modal({ title, open, onClose, children, wide = false }: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-primary/40 p-4" onMouseDown={onClose}>
      <div
        className={`max-h-[88vh] w-full overflow-y-auto rounded-(--radius-card) bg-white p-5 shadow-xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-subtext hover:bg-surface" aria-label="إغلاق">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'تأكيد', danger = false, busy = false, onConfirm, onClose }: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} open={open} onClose={onClose}>
      <div className="text-sm text-primary">{message}</div>
      <div className="mt-5 flex justify-end gap-2">
        <Btn variant="ghost" onClick={onClose} disabled={busy}>
          إلغاء
        </Btn>
        <Btn variant={danger ? 'danger' : 'accent'} onClick={onConfirm} busy={busy}>
          {confirmLabel}
        </Btn>
      </div>
    </Modal>
  );
}
