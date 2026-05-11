import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { violationTypesApi } from "../api/endpoints";
import type { Severity, ViolationType } from "../types";
import { Button } from "../components/Button";
import { Input, Select, Textarea, Switch } from "../components/Input";
import { Modal } from "../components/Modal";
import { Table, type Column } from "../components/Table";
import { Badge } from "../components/Badge";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { severityColor } from "../utils/format";

interface FormState {
  code: string;
  name_en: string;
  name_ar: string;
  description?: string;
  default_severity: Severity;
  points: number;
  instant_ban: boolean;
  is_active: boolean;
}
const emptyForm: FormState = {
  code: "", name_en: "", name_ar: "", description: "",
  default_severity: "minor", points: 1, instant_ban: false, is_active: true,
};

export function ViolationTypesPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { show } = useToast();

  const isAdmin = user?.role === "admin";

  const [rows, setRows] = useState<ViolationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ViolationType | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    setLoading(true);
    try { setRows(await violationTypesApi.list({ include_inactive: true })); }
    catch (e: any) { show("error", e?.response?.data?.detail || "Load failed"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);

  function openCreate() { setEditing(null); setForm(emptyForm); setModalOpen(true); }
  function openEdit(vt: ViolationType) {
    setEditing(vt);
    setForm({
      code: vt.code, name_en: vt.name_en, name_ar: vt.name_ar,
      description: vt.description || "", default_severity: vt.default_severity,
      points: vt.points, instant_ban: vt.instant_ban, is_active: vt.is_active,
    });
    setModalOpen(true);
  }
  async function submit() {
    setSubmitting(true);
    try {
      if (editing) {
        await violationTypesApi.update(editing.id, form);
        show("success", "Updated");
      } else {
        await violationTypesApi.create(form);
        show("success", "Added");
      }
      setModalOpen(false);
      await refresh();
    } catch (e: any) { show("error", e?.response?.data?.detail || "Save failed"); }
    finally { setSubmitting(false); }
  }
  async function remove(vt: ViolationType) {
    if (!confirm(t("delete_confirm"))) return;
    try {
      await violationTypesApi.remove(vt.id);
      show("success", "Removed");
      await refresh();
    } catch (e: any) { show("error", e?.response?.data?.detail || "Delete failed"); }
  }

  const cols: Column<ViolationType>[] = useMemo(() => [
    { key: "code", header: t("code"), cell: (v) => <span className="font-mono text-xs text-slate-300">{v.code}</span> },
    {
      key: "name", header: t("name"),
      cell: (v) => (
        <div>
          <div className="font-medium text-slate-100">{lang === "ar" ? v.name_ar : v.name_en}</div>
          <div className="text-xs text-slate-400">{lang === "ar" ? v.name_en : v.name_ar}</div>
        </div>
      ),
    },
    { key: "sev", header: t("default_severity"),
      cell: (v) => <Badge className={severityColor[v.default_severity] + " ring-1"}>{t(v.default_severity)}</Badge> },
    { key: "pts", header: t("points"), cell: (v) => v.points },
    { key: "ib", header: t("instant_ban"),
      cell: (v) => v.instant_ban
        ? <Badge className="bg-red-500/15 text-red-300 ring-red-500/30 ring-1">YES</Badge>
        : <span className="text-xs text-slate-500">NO</span> },
    { key: "active", header: t("active"),
      cell: (v) => v.is_active
        ? <Badge className="bg-emerald-500/10 text-emerald-300 ring-emerald-500/30 ring-1">YES</Badge>
        : <Badge className="bg-slate-700/30 text-slate-300 ring-slate-600/30 ring-1">NO</Badge> },
    {
      key: "actions", header: t("actions"),
      cell: (v) => isAdmin ? (
        <div className="flex items-center gap-1.5">
          <button onClick={() => openEdit(v)} title={t("edit")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-sky-300">
            <Pencil size={16} />
          </button>
          <button onClick={() => remove(v)} title={t("delete")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-300">
            <Trash2 size={16} />
          </button>
        </div>
      ) : <span className="text-xs text-slate-500">—</span>,
    },
  ], [t, lang, isAdmin]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">{t("violation_types")}</h1>
          <p className="text-sm text-slate-400">{rows.length} {t("total").toLowerCase()}</p>
        </div>
        {isAdmin && <Button icon={<Plus size={16} />} onClick={openCreate}>{t("add_violation_type")}</Button>}
      </div>

      <Table columns={cols} rows={rows} loading={loading} empty={t("no_data")} />

      <Modal
        open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? t("edit") : t("add_violation_type")}
        size="lg"
        footer={<>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>{t("cancel")}</Button>
          <Button onClick={submit} loading={submitting}>{t("save")}</Button>
        </>}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input label={t("code")} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={!!editing} hint="Uppercase, no spaces" />
          <Select label={t("default_severity")} value={form.default_severity} onChange={(e) => setForm({ ...form, default_severity: e.target.value as Severity })}>
            <option value="minor">{t("minor")}</option>
            <option value="major">{t("major")}</option>
            <option value="critical">{t("critical")}</option>
          </Select>
          <Input label={t("name_en")} value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
          <Input label={t("name_ar")} dir="rtl" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
          <Input type="number" min={1} max={100} label={t("points")} value={form.points} onChange={(e) => setForm({ ...form, points: Number(e.target.value) || 1 })} />
          <div className="flex items-end gap-6 pb-1">
            <Switch checked={form.instant_ban} onChange={(v) => setForm({ ...form, instant_ban: v })} label={t("instant_ban")} />
            <Switch checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label={t("active")} />
          </div>
          <div className="md:col-span-2">
            <Textarea label={t("description")} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <p className="mt-1 text-xs text-slate-500">{t("instant_ban_help")}</p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
