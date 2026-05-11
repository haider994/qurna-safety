import { useEffect, useState } from "react";
import { auditApi } from "../api/endpoints";
import type { AuditEntry } from "../types";
import { Table, type Column } from "../components/Table";
import { Card } from "../components/Card";
import { Input, Select } from "../components/Input";
import { Button } from "../components/Button";
import { Badge } from "../components/Badge";
import { useI18n } from "../i18n/I18nContext";
import { formatDate } from "../utils/format";
import { RefreshCw } from "lucide-react";

export function AuditPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");
  const [entity, setEntity] = useState("");
  const [username, setUsername] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const r = await auditApi.list({
        action: action || undefined,
        entity_type: entity || undefined,
        username: username || undefined,
        limit: 300,
      });
      setRows(r);
    } finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); /* eslint-disable-next-line */ }, []);

  const actionColors: Record<string, string> = {
    create: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
    update: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
    delete: "bg-red-500/15 text-red-300 ring-red-500/30",
    login: "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30",
    login_failed: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
    reinstate: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  };

  const cols: Column<AuditEntry>[] = [
    { key: "when", header: t("occurred_at"), cell: (e) => <span className="text-xs">{formatDate(e.created_at)}</span> },
    { key: "user", header: t("user"), cell: (e) => e.username || "-" },
    {
      key: "action", header: t("action"),
      cell: (e) => <Badge className={(actionColors[e.action] || "bg-slate-500/15 text-slate-300 ring-slate-500/30") + " ring-1"}>{e.action}</Badge>,
    },
    { key: "entity", header: t("entity"), cell: (e) => e.entity_type },
    { key: "eid", header: t("entity_id"), cell: (e) => e.entity_id || "-" },
    { key: "details", header: t("details"), cell: (e) => <span className="text-xs text-slate-300">{e.details || "-"}</span> },
    { key: "ip", header: t("ip"), cell: (e) => e.ip_address || "-" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-50">{t("audit_log")}</h1>
        <p className="text-sm text-slate-400">{rows.length} entries</p>
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-4">
          <Input placeholder={t("user")} value={username} onChange={(e) => setUsername(e.target.value)} />
          <Select value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">{t("action")}</option>
            <option value="create">create</option>
            <option value="update">update</option>
            <option value="delete">delete</option>
            <option value="login">login</option>
            <option value="login_failed">login_failed</option>
            <option value="reinstate">reinstate</option>
          </Select>
          <Select value={entity} onChange={(e) => setEntity(e.target.value)}>
            <option value="">{t("entity")}</option>
            <option value="driver">driver</option>
            <option value="contractor">contractor</option>
            <option value="violation">violation</option>
            <option value="violation_type">violation_type</option>
            <option value="user">user</option>
            <option value="auth">auth</option>
          </Select>
          <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={refresh}>{t("apply")}</Button>
        </div>
      </Card>

      <Table columns={cols} rows={rows} loading={loading} empty={t("no_data")} />
    </div>
  );
}
