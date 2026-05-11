import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, FileText, RefreshCw, Download, AlertTriangle } from "lucide-react";
import { contractorsApi } from "../api/endpoints";
import type { Contractor } from "../types";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Modal } from "../components/Modal";
import { Table, type Column } from "../components/Table";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { apiDownloadUrl } from "../api/client";

type FormState = Partial<Contractor> & { name: string };
const emptyForm: FormState = { name: "", name_ar: "", contact_person: "", contact_phone: "", contact_email: "", notes: "", is_active: true, is_blacklisted: false };

export function ContractorsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { show } = useToast();

  const [rows, setRows] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Contractor | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const canEdit = user?.role === "admin" || user?.role === "data_entry";
  const isAdmin = user?.role === "admin";

  async function refresh() {
    setLoading(true);
    try {
      const d = await contractorsApi.list({ q: q || undefined });
      setRows(d);
    } catch (e: any) {
      show("error", e?.response?.data?.detail || "Failed to load");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void refresh(); /* eslint-disable-next-line */ }, []);

  function openCreate() { setEditing(null); setForm(emptyForm); setModalOpen(true); }
  function openEdit(c: Contractor) { setEditing(c); setForm({ ...c }); setModalOpen(true); }

  async function submit() {
    setSubmitting(true);
    try {
      if (editing) {
        await contractorsApi.update(editing.id, form);
        show("success", "Contractor updated");
      } else {
        await contractorsApi.create(form);
        show("success", "Contractor added");
      }
      setModalOpen(false);
      await refresh();
    } catch (e: any) {
      show("error", e?.response?.data?.detail || "Save failed");
    } finally {
      setSubmitting(false);
    }
  }
  async function remove(c: Contractor) {
    if (!confirm(t("delete_confirm"))) return;
    try {
      await contractorsApi.remove(c.id);
      show("success", "Deleted");
      await refresh();
    } catch (e: any) {
      show("error", e?.response?.data?.detail || "Delete failed");
    }
  }

  const cols: Column<Contractor>[] = useMemo(() => [
    {
      key: "name", header: t("name"),
      cell: (c) => (
        <div>
          <div className="font-medium text-slate-100 flex items-center gap-2">
            {c.name}
            {c.violating_driver_count > 0 && c.driver_count > 0 && (c.violating_driver_count / c.driver_count) >= 0.3 && (
              <AlertTriangle size={14} className="text-amber-400" />
            )}
          </div>
          {c.name_ar && <div className="text-xs text-slate-400">{c.name_ar}</div>}
        </div>
      ),
    },
    { key: "contact", header: t("contact_person"), cell: (c) => c.contact_person || "-" },
    { key: "phone", header: t("phone"), cell: (c) => c.contact_phone || "-" },
    { key: "drivers", header: t("drivers_count"), cell: (c) => c.driver_count },
    { key: "violators", header: t("violating_drivers"),
      cell: (c) => (
        <Badge className={c.violating_driver_count > 0 ? "bg-amber-500/15 text-amber-300 ring-amber-500/30" : "bg-slate-700/30 text-slate-300 ring-slate-600/40"}>
          {c.violating_driver_count}
        </Badge>
      ),
    },
    { key: "vio", header: t("total_violations"), cell: (c) => c.total_violations },
    { key: "status", header: t("status"),
      cell: (c) => c.is_blacklisted
        ? <Badge className="bg-red-500/15 text-red-300 ring-red-500/30">{t("blacklisted")}</Badge>
        : c.is_active
          ? <Badge className="bg-emerald-500/10 text-emerald-300 ring-emerald-500/30">{t("active")}</Badge>
          : <Badge className="bg-slate-700/30 text-slate-300 ring-slate-600/30">{t("inactive")}</Badge>,
    },
    {
      key: "actions", header: t("actions"),
      cell: (c) => (
        <div className="flex items-center gap-1.5">
          <a
            href={apiDownloadUrl(`/api/reports/contractor/${c.id}.pdf`)}
            target="_blank" rel="noreferrer"
            title={t("contractor_report")}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-indigo-300"
          >
            <FileText size={16} />
          </a>
          {canEdit && (
            <button onClick={() => openEdit(c)} title={t("edit")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-sky-300">
              <Pencil size={16} />
            </button>
          )}
          {isAdmin && (
            <button onClick={() => remove(c)} title={t("delete")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-300">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ], [t, canEdit, isAdmin]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">{t("contractors")}</h1>
          <p className="text-sm text-slate-400">{rows.length} {t("total").toLowerCase()}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={apiDownloadUrl("/api/reports/contractors.xlsx")}
            target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs text-slate-100 hover:bg-slate-800"
          >
            <Download size={14} /> {t("export_excel")}
          </a>
          {canEdit && <Button icon={<Plus size={16} />} onClick={openCreate}>{t("add_contractor")}</Button>}
        </div>
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} leftIcon={<Search size={14} />} />
          <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={refresh}>{t("apply")}</Button>
          <Button variant="ghost" onClick={() => { setQ(""); setTimeout(refresh, 0); }}>{t("reset_filters")}</Button>
        </div>
      </Card>

      <Table columns={cols} rows={rows} loading={loading} empty={t("no_data")} />

      <Modal
        open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? t("edit_contractor") : t("add_contractor")}
        footer={<>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>{t("cancel")}</Button>
          <Button onClick={submit} loading={submitting}>{t("save")}</Button>
        </>}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input label={t("name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input label={t("name_ar")} dir="rtl" value={form.name_ar || ""} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
          <Input label={t("contact_person")} value={form.contact_person || ""} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} />
          <Input label={t("phone")} value={form.contact_phone || ""} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} />
          <Input label={t("email")} type="email" value={form.contact_email || ""} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          <div className="md:col-span-2">
            <Input label={t("notes")} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {isAdmin && (
            <div className="md:col-span-2 flex items-center gap-6">
              <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="rounded" />
                {t("active")}
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input type="checkbox" checked={form.is_blacklisted ?? false} onChange={(e) => setForm({ ...form, is_blacklisted: e.target.checked })} className="rounded" />
                {t("blacklisted")}
              </label>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
