import type { ReactNode } from "react";
import clsx from "clsx";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  width?: string;
}

export function Table<T extends { id: number | string }>({
  columns,
  rows,
  empty,
  loading,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: ReactNode;
  loading?: boolean;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="min-w-full divide-y divide-slate-800 text-sm">
        <thead className="bg-slate-900/80">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                style={c.width ? { width: c.width } : undefined}
                className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-slate-400"
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 bg-slate-950/40">
          {loading ? (
            <tr>
              <td className="px-4 py-12 text-center text-slate-400" colSpan={columns.length}>
                <div className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
                    <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="3" fill="none" />
                  </svg>
                  <span>Loading...</span>
                </div>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td className="px-4 py-12 text-center text-slate-500" colSpan={columns.length}>
                {empty || "No data"}
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr
                key={r.id}
                className={clsx("hover:bg-slate-900/60 transition-colors", onRowClick && "cursor-pointer")}
                onClick={onRowClick ? () => onRowClick(r) : undefined}
              >
                {columns.map((c) => (
                  <td key={c.key} className={clsx("px-4 py-3 text-slate-200", c.className)}>
                    {c.cell(r)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
