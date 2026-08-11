// توست بسيط — نجاح/خطأ للعمليات.
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

type ToastItem = { id: number; kind: 'success' | 'error'; text: string };

const ToastCtx = createContext<{ toast: (kind: 'success' | 'error', text: string) => void }>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastCtx);
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const toast = useCallback((kind: 'success' | 'error', text: string) => {
    const id = nextId++;
    setItems((prev) => [...prev, { id, kind, text }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 start-4 z-50 flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${t.kind === 'success' ? 'bg-success' : 'bg-danger'}`}
          >
            {t.kind === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
