import type { ReactNode } from "react";
import clsx from "clsx";

export function Card({
  children,
  className,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={clsx("rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm shadow-lg", className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-3">
          <div>
            {title && <div className="text-sm font-semibold text-slate-100">{title}</div>}
            {subtitle && <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  tint = "indigo",
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  tint?: "indigo" | "emerald" | "amber" | "red" | "sky" | "slate";
  accent?: ReactNode;
}) {
  const tints: Record<string, string> = {
    indigo: "from-indigo-500/15 text-indigo-400",
    emerald: "from-emerald-500/15 text-emerald-400",
    amber: "from-amber-500/15 text-amber-400",
    red: "from-red-500/15 text-red-400",
    sky: "from-sky-500/15 text-sky-400",
    slate: "from-slate-500/15 text-slate-300",
  };
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-md">
      <div className={clsx("absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none opacity-50", tints[tint])} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
          <div className="mt-2 text-3xl font-bold text-slate-50">{value}</div>
          {accent && <div className="mt-1 text-xs text-slate-400">{accent}</div>}
        </div>
        <div className={clsx("rounded-lg p-2.5 ring-1 ring-inset", tints[tint], "bg-slate-900/50 ring-current/30")}>
          {icon}
        </div>
      </div>
    </div>
  );
}
