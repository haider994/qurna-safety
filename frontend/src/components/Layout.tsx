import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users as UsersIcon,
  Building2,
  ShieldAlert,
  FileWarning,
  ClipboardList,
  UserCog,
  LogOut,
  Menu,
  X,
  Globe,
  ShieldCheck,
} from "lucide-react";
import clsx from "clsx";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n/I18nContext";

export function Layout() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const isAdmin = user?.role === "admin";

  const items = [
    { to: "/", end: true, icon: <LayoutDashboard size={18} />, label: t("nav_dashboard") },
    { to: "/drivers", icon: <UsersIcon size={18} />, label: t("nav_drivers") },
    { to: "/contractors", icon: <Building2 size={18} />, label: t("nav_contractors") },
    { to: "/violations", icon: <ShieldAlert size={18} />, label: t("nav_violations") },
    { to: "/violation-types", icon: <FileWarning size={18} />, label: t("nav_violation_types") },
    ...(isAdmin ? [{ to: "/users", icon: <UserCog size={18} />, label: t("nav_users") }] : []),
    ...(isAdmin ? [{ to: "/audit", icon: <ClipboardList size={18} />, label: t("nav_audit") }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Topbar (mobile) */}
      <div className="lg:hidden sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950/95 backdrop-blur px-4">
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-slate-300 hover:bg-slate-800">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-indigo-400" />
          <div className="font-semibold">{t("app_name")}</div>
        </div>
        <button
          onClick={() => setLang(lang === "en" ? "ar" : "en")}
          className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"
          aria-label="Toggle language"
        >
          <Globe size={18} />
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={clsx(
          "fixed inset-y-0 start-0 z-40 w-72 transform border-e border-slate-800 bg-slate-950 transition-transform lg:translate-x-0 rtl:lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full rtl:translate-x-full lg:translate-x-0 rtl:lg:translate-x-0"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-600 p-1.5"><ShieldCheck size={18} className="text-white" /></div>
            <div>
              <div className="text-sm font-semibold leading-tight">{t("app_name")}</div>
              <div className="text-[10px] text-slate-400 leading-tight">{t("app_subtitle")}</div>
            </div>
          </div>
          <button className="lg:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-800" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-indigo-600/20 text-indigo-200 ring-1 ring-inset ring-indigo-500/30"
                    : "text-slate-300 hover:bg-slate-800/70"
                )
              }
            >
              <span className="text-slate-400">{it.icon}</span>
              <span>{it.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="absolute inset-x-0 bottom-0 border-t border-slate-800 p-3">
          <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-100">
                {user?.full_name || user?.username}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-slate-400">{user?.role}</div>
            </div>
            <button
              title="Logout"
              onClick={() => { logout(); nav("/login"); }}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-400"
            >
              <LogOut size={16} />
            </button>
          </div>
          <button
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-800/70 px-3 py-2 text-xs text-slate-200 hover:bg-slate-800"
          >
            <Globe size={14} /> {t("lang_switch")}
          </button>
        </div>
      </aside>

      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/50 lg:hidden" />
      )}

      <main className="lg:ms-72 min-h-screen">
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
