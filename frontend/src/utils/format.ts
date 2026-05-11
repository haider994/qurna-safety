import type { DriverStatus, Severity } from "../types";

export function formatDate(s: string | null | undefined, withTime = true): string {
  if (!s) return "-";
  const d = new Date(s);
  if (isNaN(d.getTime())) return "-";
  const opts: Intl.DateTimeFormatOptions = withTime
    ? { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }
    : { year: "numeric", month: "short", day: "2-digit" };
  return d.toLocaleString(undefined, opts);
}

export function toInputDateTime(s: string | Date | null | undefined): string {
  if (!s) return "";
  const d = typeof s === "string" ? new Date(s) : s;
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function nowInputDateTime(): string {
  return toInputDateTime(new Date());
}

export function fromInputDateTime(s: string): string {
  if (!s) return "";
  return new Date(s).toISOString();
}

export const statusColor: Record<DriverStatus, string> = {
  active: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30",
  notice: "bg-sky-500/10 text-sky-400 ring-sky-500/30",
  warning: "bg-amber-500/10 text-amber-400 ring-amber-500/30",
  suspended: "bg-orange-500/10 text-orange-400 ring-orange-500/30",
  banned: "bg-red-500/10 text-red-400 ring-red-500/30",
};

export const severityColor: Record<Severity, string> = {
  minor: "bg-slate-500/15 text-slate-300 ring-slate-400/30",
  major: "bg-amber-500/15 text-amber-300 ring-amber-400/30",
  critical: "bg-red-500/15 text-red-300 ring-red-400/30",
};
