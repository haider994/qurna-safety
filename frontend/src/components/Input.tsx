import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

const baseField =
  "w-full rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-500 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 focus:outline-none disabled:opacity-50";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
}
export function Input({ label, hint, error, leftIcon, className, ...rest }: InputProps) {
  return (
    <label className="block">
      {label && <div className="mb-1 text-xs font-medium text-slate-300">{label}</div>}
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400">
            {leftIcon}
          </span>
        )}
        <input
          {...rest}
          className={clsx(baseField, leftIcon && "ps-9", className)}
        />
      </div>
      {hint && !error && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
      {error && <div className="mt-1 text-xs text-red-400">{error}</div>}
    </label>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  children: ReactNode;
}
export function Select({ label, children, className, ...rest }: SelectProps) {
  return (
    <label className="block">
      {label && <div className="mb-1 text-xs font-medium text-slate-300">{label}</div>}
      <select {...rest} className={clsx(baseField, "pe-8", className)}>
        {children}
      </select>
    </label>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}
export function Textarea({ label, className, ...rest }: TextareaProps) {
  return (
    <label className="block">
      {label && <div className="mb-1 text-xs font-medium text-slate-300">{label}</div>}
      <textarea {...rest} className={clsx(baseField, "min-h-[80px]", className)} />
    </label>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="inline-flex items-center gap-3 cursor-pointer select-none">
      <span
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
          checked ? "bg-indigo-600" : "bg-slate-600"
        )}
      >
        <span
          className={clsx(
            "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0.5 rtl:-translate-x-0.5"
          )}
        />
      </span>
      {label && <span className="text-sm text-slate-200">{label}</span>}
    </label>
  );
}
