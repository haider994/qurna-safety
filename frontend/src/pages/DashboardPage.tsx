import { useEffect, useState } from "react";
import {
  Users as UsersIcon,
  Building2,
  ShieldAlert,
  AlertTriangle,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { dashboardApi } from "../api/endpoints";
import type { DashboardData } from "../types";
import { Card, StatCard } from "../components/Card";
import { Badge } from "../components/Badge";
import { useI18n } from "../i18n/I18nContext";

const SEVERITY_COLORS = { minor: "#64748b", major: "#f59e0b", critical: "#ef4444" };

export function DashboardPage() {
  const { t, lang } = useI18n();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.get()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <div className="text-slate-400">{t("loading")}</div>;
  }
  const s = data.stats;

  const statusData = [
    { name: t("status_active"), value: s.active_drivers, color: "#10b981" },
    { name: t("status_notice"), value: s.notice_drivers, color: "#0ea5e9" },
    { name: t("status_warning"), value: s.warning_drivers, color: "#f59e0b" },
    { name: t("status_suspended"), value: s.suspended_drivers, color: "#fb923c" },
    { name: t("status_banned"), value: s.banned_drivers, color: "#ef4444" },
  ];

  const sev = data.severity_breakdown;
  const sevData = [
    { name: t("minor"), value: sev.minor, color: SEVERITY_COLORS.minor },
    { name: t("major"), value: sev.major, color: SEVERITY_COLORS.major },
    { name: t("critical"), value: sev.critical, color: SEVERITY_COLORS.critical },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-50">{t("nav_dashboard")}</h1>
        <p className="text-sm text-slate-400 mt-1">{t("dashboard_overview")} - {t("field_name")}</p>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<UsersIcon size={20} />} tint="indigo" label={t("total_drivers")} value={s.total_drivers}
          accent={`${s.banned_drivers} ${t("status_banned").toLowerCase()}`} />
        <StatCard icon={<Building2 size={20} />} tint="sky" label={t("total_contractors")} value={s.total_contractors} />
        <StatCard icon={<ShieldAlert size={20} />} tint="amber" label={t("total_violations")} value={s.total_violations}
          accent={`${s.violations_this_month} ${t("month").toLowerCase()}`} />
        <StatCard icon={<CalendarDays size={20} />} tint="emerald" label={t("violations_today")} value={s.violations_today}
          accent={`${s.violations_this_week} ${t("week").toLowerCase()}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t("drivers_by_status")} className="lg:col-span-1">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#cbd5e1" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={t("violations_last_30_days")} className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.violations_by_day}>
                <defs>
                  <linearGradient id="vio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" tickFormatter={(d) => d.slice(5)} fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fill="url(#vio)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t("violations_by_type")}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.violations_by_type} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey={lang === "ar" ? "extra" : "name"} width={150} fontSize={11} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                <Bar dataKey="count" fill="#818cf8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title={t("severity_breakdown")}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sevData} dataKey="value" nameKey="name" outerRadius={90}>
                  {sevData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11, color: "#cbd5e1" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t("top_drivers")} subtitle={<><TrendingUp className="inline" size={12}/> {t("violations")}</>}>
          {data.top_drivers.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">{t("no_data")}</div>
          ) : (
            <ul className="space-y-2">
              {data.top_drivers.map((d, i) => (
                <li key={d.id} className="flex items-center justify-between rounded-lg bg-slate-900/40 px-3 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-300">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="truncate text-sm text-slate-100">{lang === "ar" && d.extra ? d.extra : d.name}</div>
                    </div>
                  </div>
                  <Badge className="bg-red-500/10 text-red-300 ring-red-500/30">{d.count}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t("top_contractors")}>
          {data.top_contractors.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">{t("no_data")}</div>
          ) : (
            <ul className="space-y-2">
              {data.top_contractors.map((d, i) => (
                <li key={d.id} className="flex items-center justify-between rounded-lg bg-slate-900/40 px-3 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/20 text-xs font-semibold text-amber-300">{i + 1}</span>
                    <div className="truncate text-sm text-slate-100">{d.name}</div>
                  </div>
                  <Badge className="bg-amber-500/10 text-amber-300 ring-amber-500/30">{d.count}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title={
        <span className="flex items-center gap-2">
          <AlertTriangle className="text-amber-400" size={16}/> {t("contractor_risk")}
        </span>
      } subtitle={t("risk_help")}>
        {data.contractor_risk.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">{t("no_data")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-start text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-3 py-2 text-start">{t("contractor")}</th>
                  <th className="px-3 py-2 text-end">{t("drivers_count")}</th>
                  <th className="px-3 py-2 text-end">{t("violating_drivers")}</th>
                  <th className="px-3 py-2 text-end">%</th>
                  <th className="px-3 py-2 text-end">{t("total_violations")}</th>
                  <th className="px-3 py-2 text-end">{t("status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {data.contractor_risk.map((c) => (
                  <tr key={c.contractor_id} className="hover:bg-slate-900/60">
                    <td className="px-3 py-2 text-slate-100">{c.contractor_name}</td>
                    <td className="px-3 py-2 text-end">{c.driver_count}</td>
                    <td className="px-3 py-2 text-end">{c.violating_driver_count}</td>
                    <td className="px-3 py-2 text-end font-semibold">{c.violating_percent}%</td>
                    <td className="px-3 py-2 text-end">{c.total_violations}</td>
                    <td className="px-3 py-2 text-end">
                      {c.is_risk ? (
                        <Badge className="bg-red-500/15 text-red-300 ring-red-500/30">RISK</Badge>
                      ) : (
                        <Badge className="bg-emerald-500/10 text-emerald-300 ring-emerald-500/30">OK</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
