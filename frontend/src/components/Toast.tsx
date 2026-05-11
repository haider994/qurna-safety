import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, XCircle, Info, AlertTriangle } from "lucide-react";
import clsx from "clsx";

type ToastType = "success" | "error" | "info" | "warning";
interface ToastItem { id: number; type: ToastType; text: string; }

interface ToastCtx { show: (type: ToastType, text: string) => void; }
const Ctx = createContext<ToastCtx | null>(null);

let counter = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((type: ToastType, text: string) => {
    const id = counter++;
    setItems((prev) => [...prev, { id, type, text }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 4500);
  }, []);

  const icons = {
    success: <CheckCircle2 size={18} className="text-emerald-400" />,
    error: <XCircle size={18} className="text-red-400" />,
    info: <Info size={18} className="text-sky-400" />,
    warning: <AlertTriangle size={18} className="text-amber-400" />,
  };
  const borders = {
    success: "border-emerald-500/30",
    error: "border-red-500/30",
    info: "border-sky-500/30",
    warning: "border-amber-500/30",
  };

  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 end-4 z-[100] flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className={clsx(
              "flex items-start gap-2 rounded-lg border bg-slate-900/95 px-4 py-2.5 shadow-xl backdrop-blur-md",
              borders[t.type]
            )}
          >
            {icons[t.type]}
            <span className="text-sm text-slate-100 max-w-[320px]">{t.text}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useToast must be used inside ToastProvider");
  return c;
}
