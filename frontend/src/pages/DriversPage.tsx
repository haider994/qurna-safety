import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, FileText, RefreshCw, Download, ShieldCheck } from "lucide-react";
import { contractorsApi, driversApi } from "../api/endpoints";
import type { Contractor, Driver, DriverStatus } from "../types";
import { Button } from "../components/Button";
import { Input, Select } from "../components/Input";
import { Modal } from "../components/Modal";
import { Table, type Column } from "../components/Table";
import { Badge } from "../components/Badge";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { Card } from "../components/Card";
import { statusColor, toInputDateTime, fromInputDateTime } from "../utils/format";
import { apiDownloadUrl } from "../api/client";

type FormState = Partial<Driver> & { full_name: string };

const emptyForm: FormState = {
  full_name: "",
  full_name_ar: "",
  national_id: "",
  license_number: "",
  license_expiry: null,
  defensive_driving_expiry: null,
  nationality: "",
  phone: "",
  notes: "",
  contractor_id: null,
  is_active: true,
};

export function DriversPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { show } = useToast();

  const [rows, setRows] = useState<Driver[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [contractorFilter, setContractorFilter] = useState<number | "">("");
  const [statusFilter, setStatusFilter] = useState<DriverStatus | "">("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const canEdit = user?.role === "admin" || user?.role === "data_entry";
  const isAdmin = user?.role === "admin";

  async function refresh() {
    setLoading(true);
    try {
      const [d, c] = await Promise.all([
        driversApi.list({
          q: q || undefined,
          contractor_id: contractorFilter === "" ? undefined : contractorFilter,
          status_filter: statusFilter || undefined,
        }),
        contractorsApi.list({ include_inactive: true }),
      ]);
      setRows(d);
      setContractors(c);
    } catch (e: any) {
      show("error", e?.response?.data?.detail || "Failed to load drivers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); /* eslint-disable-next-line */ }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }
  function openEdit(d: Driver) {
    setEditing(d);
    setForm({
      ...d,
      license_expiry: d.license_expiry ?? null,
      defensive_driving_expiry: d.defensive_driving_expiry ?? null,
    });
    setModalOpen(true);
  }

  async function submit() {
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        license_expiry: form.license_expiry ? fromInputDateTime(form.license_expiry as string) : null,
        defensive_driving_expiry: form.defensive_driving_expiry ? fromInputDateTime(form.defensive_driving_expiry as string) : null,
        contractor_id: form.contractor_id || null,
      };
      if (editing) {
        await driversApi.update(editing.id, payload);
        show("success", `Driver updated`);
      } else {
        await driversApi.create(payload);
        show("success", `Driver added`);
      }
      setModalOpen(false);
      await refresh();
    } catch (e: any) {
      show("error", e?.response?.data?.detail || "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(d: Driver) {
    if (!confirm(t("delete_confirm"))) return;
    try {
      await driversApi.remove(d.id);
      show("success", "Driver deleted");
      await refresh();
    } catch (e: any) {
      show("error", e?.response?.data?.detail || "Delete failed");
    }
  }

  async function reinstate(d: Driver) {
    if (!confirm(t("reinstate_confirm"))) return;
    try {
      await driversApi.reinstate(d.id);
      show("success", "Driver reinstated");
      await refresh();
    } catch (e: any) {
      show("error", e?.response?.data?.detail || "Action failed");
    }
  }

  const cols: Column<Driver>[] = useMemo(() => {
    const arr: Column<Driver>[] = [
      {
        key: "name",
        header: t("full_name"),
        cell: (d) => (
          <div>
            <div className="font-medium text-slate-100">{d.full_name}</div>
            {d.full_name_ar && <div className="text-xs text-slate-400">{d.full_name_ar}</div>}
          </div>
        ),
      },
      { key: "license", header: t("license_number"), cell: (d) => d.license_number || "-" },
      { key: "contractor", header: t("contractor"),
        cell: (d) => d.contractor_name || <span className="text-slate-500">{t("no_contractor")}</span> },
      {
        key: "violations", header: t("violations_count"),
        cell: (d) => (
          <Badge className={d.violation_count > 0 ? "bg-amber-500/15 text-amber-300 ring-amber-500/30" : "bg-slate-700/30 text-slate-300 ring-slate-600/40"}>
            {d.violation_count}
          </Badge>
        ),
      },
      {
        key: "status", header: t("status"),
        cell: (d) => (
          <Badge className={statusColor[d.status] + " ring-1"}>
            {t((`status_${d.status}`) as any)}
          </Badge>
        ),
      },
      {
        key: "actions",
        header: t("actions"),
        cell: (d) => (
          <div className="flex items-center gap-1.5">
            <a
              href={apiDownloadUrl(`/api/reports/driver/${d.id}.pdf`)}
              target="_blank"
              rel="noreferrer"
              title={t("driver_report")}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-indigo-300"
            >
              <FileText size={16} />
            </a>
            {canEdit && (
              <button onClick={() => openEdit(d)} title={t("edit")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-sky-300">
                <Pencil size={16} />
              </button>
            )}
            {isAdmin && d.is_blacklisted && (
              <button onClick={() => reinstate(d)} title={t("reinstate")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-emerald-300">
                <ShieldCheck size={16} />
              </button>
            )}
            {isAdmin && (
              <button onClick={() => remove(d)} title={t("delete")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-300">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ),
      },
    ];
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, lang, canEdit, isAdmin]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">{t("drivers")}</h1>
          <p className="text-sm text-slate-400">{rows.length} {t("total").toLowerCase()}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={apiDownloadUrl("/api/reports/drivers.xlsx")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs text-slate-100 hover:bg-slate-800"
          >
            <Download size={14} /> {t("export_excel")}
          </a>
          {canEdit && (
            <Button icon={<Plus size={16} />} onClick={openCreate}>{t("add_driver")}</Button>
          )}
        </div>
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-4">
          <Input placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} leftIcon={<Search size={14} />} />
          <Select value={contractorFilter} onChange={(e) => setContractorFilter(e.target.value === "" ? "" : Number(e.target.value))}>
            <option value="">{t("filter_by_contractor")}</option>
            {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as DriverStatus | "")}>
            <option value="">{t("status")}</option>
            <option value="active">{t("status_active")}</option>
            <option value="notice">{t("status_notice")}</option>
            <option value="warning">{t("status_warning")}</option>
            <option value="suspended">{t("status_suspended")}</option>
            <option value="banned">{t("status_banned")}</option>
          </Select>
          <div className="flex gap-2">
            <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={refresh}>{t("apply")}</Button>
            <Button variant="ghost" onClick={() => { setQ(""); setContractorFilter(""); setStatusFilter(""); setTimeout(refresh, 0); }}>{t("reset_filters")}</Button>
          </div>
        </div>
      </Card>

      <Table columns={cols} rows={rows} loading={loading} empty={t("no_data")} />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t("edit_driver") : t("add_driver")}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>{t("cancel")}</Button>
            <Button onClick={submit} loading={submitting}>{t("save")}</Button>
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input label={t("full_name")} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <Input label={t("full_name_ar")} dir="rtl" value={form.full_name_ar || ""} onChange={(e) => setForm({ ...form, full_name_ar: e.target.value })} />
          <Input label={t("national_id")} value={form.national_id || ""} onChange={(e) => setForm({ ...form, national_id: e.target.value })} />
          <Input label={t("license_number")} value={form.license_number || ""} onChange={(e) => setForm({ ...form, license_number: e.target.value })} />
          <Input type="datetime-local" label={t("license_expiry")} value={toInputDateTime(form.license_expiry as string | null)} onChange={(e) => setForm({ ...form, license_expiry: e.target.value })} />
          <Input type="datetime-local" label={t("defensive_driving_expiry")} value={toInputDateTime(form.defensive_driving_expiry as string | null)} onChange={(e) => setForm({ ...form, defensive_driving_expiry: e.target.value })} />
          <Input label={t("nationality")} value={form.nationality || ""} onChange={(e) => setForm({ ...form, nationality: e.target.value })} />
          <Input label={t("phone")} value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Select label={t("contractor")} value={form.contractor_id ?? ""} onChange={(e) => setForm({ ...form, contractor_id: e.target.value === "" ? null : Number(e.target.value) })}>
            <option value="">{t("no_contractor")}</option>
            {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <div className="md:col-span-2">
            <Input label={t("notes")} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
