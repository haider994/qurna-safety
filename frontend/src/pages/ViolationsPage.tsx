import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, RefreshCw, Download, ShieldAlert } from "lucide-react";
import { contractorsApi, driversApi, violationsApi, violationTypesApi } from "../api/endpoints";
import type { Contractor, Driver, Severity, Violation, ViolationType } from "../types";
import { Button } from "../components/Button";
import { Input, Select, Textarea } from "../components/Input";
import { Modal } from "../components/Modal";
import { Table, type Column } from "../components/Table";
import { Badge } from "../components/Badge";
import { Card } from "../components/Card";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { formatDate, fromInputDateTime, nowInputDateTime, toInputDateTime, severityColor, statusColor } from "../utils/format";
import { apiDownloadUrl } from "../api/client";

interface FormState {
  driver_id?: number;
  violation_type_id?: number;
  severity?: Severity;
  occurred_at: string;
  location?: string;
  vehicle_plate?: string;
  speed_kmh?: number;
  description?: string;
  attachment_url?: string;
  reported_by?: string;
}

const emptyForm: FormState = { occurred_at: nowInputDateTime() };

export function ViolationsPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { show } = useToast();

  const [rows, setRows] = useState<Violation[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [types, setTypes] = useState<ViolationType[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterContractor, setFilterContractor] = useState<number | "">("");
  const [filterDriver, setFilterDriver] = useState<number | "">("");
  const [filterType, setFilterType] = useState<number | "">("");
  const [filterSeverity, setFilterSeverity] = useState<Severity | "">("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Violation | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const canEdit = user?.role === "admin" || user?.role === "data_entry";
  const isAdmin = user?.role === "admin";

  async function loadRefs() {
    const [d, c, vt] = await Promise.all([
      driversApi.list({ include_inactive: true }),
      contractorsApi.list({ include_inactive: true }),
      violationTypesApi.list({ include_inactive: false }),
    ]);
    setDrivers(d);
    setContractors(c);
    setTypes(vt);
  }

  async function refresh() {
    setLoading(true);
    try {
      const params: any = {};
      if (filterContractor !== "") params.contractor_id = filterContractor;
      if (filterDriver !== "") params.driver_id = filterDriver;
      if (filterType !== "") params.violation_type_id = filterType;
      if (filterSeverity !== "") params.severity = filterSeverity;
      if (filterFrom) params.date_from = fromInputDateTime(filterFrom);
      if (filterTo) params.date_to = fromInputDateTime(filterTo);
      const r = await violationsApi.list(params);
      setRows(r);
    } catch (e: any) {
      show("error", e?.response?.data?.detail || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadRefs(); void refresh(); /* eslint-disable-next-line */ }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, occurred_at: nowInputDateTime() });
    setModalOpen(true);
  }
  function openEdit(v: Violation) {
    setEditing(v);
    setForm({
      driver_id: v.driver_id,
      violation_type_id: v.violation_type_id,
      severity: v.severity,
      occurred_at: toInputDateTime(v.occurred_at),
      location: v.location || "",
      vehicle_plate: v.vehicle_plate || "",
      speed_kmh: v.speed_kmh ?? undefined,
      description: v.description || "",
      attachment_url: v.attachment_url || "",
      reported_by: v.reported_by || "",
    });
    setModalOpen(true);
  }

  async function submit() {
    if (!form.driver_id || !form.violation_type_id || !form.occurred_at) {
      show("error", "Driver, type and date are required");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        driver_id: form.driver_id,
        violation_type_id: form.violation_type_id,
        severity: form.severity,
        occurred_at: fromInputDateTime(form.occurred_at),
        location: form.location,
        vehicle_plate: form.vehicle_plate,
        speed_kmh: form.speed_kmh ? Number(form.speed_kmh) : undefined,
        description: form.description,
        attachment_url: form.attachment_url,
        reported_by: form.reported_by,
      };
      if (editing) {
        await violationsApi.update(editing.id, payload as any);
        show("success", "Violation updated");
      } else {
        const created = await violationsApi.create(payload as any);
        show(
          created.triggered_status === "banned" ? "warning" : "success",
          `Violation logged - driver is now ${created.triggered_status?.toUpperCase()}`
        );
      }
      setModalOpen(false);
      await refresh();
    } catch (e: any) {
      show("error", e?.response?.data?.detail || "Save failed");
    } finally {
      setSubmitting(false);
    }
  }
  async function remove(v: Violation) {
    if (!confirm(t("delete_confirm"))) return;
    try {
      await violationsApi.remove(v.id);
      show("success", "Violation deleted");
      await refresh();
    } catch (e: any) {
      show("error", e?.response?.data?.detail || "Delete failed");
    }
  }

  const cols: Column<Violation>[] = useMemo(() => [
    { key: "when", header: t("occurred_at"), cell: (v) => <span className="text-xs text-slate-300">{formatDate(v.occurred_at)}</span> },
    {
      key: "driver", header: t("driver"),
      cell: (v) => (
        <div>
          <div className="font-medium text-slate-100">{v.driver_name}</div>
          <div className="text-xs text-slate-400">{v.contractor_name || "-"}</div>
        </div>
      ),
    },
    {
      key: "type", header: t("violation_type"),
      cell: (v) => <span>{lang === "ar" ? v.violation_type_name_ar : v.violation_type_name_en}</span>,
    },
    {
      key: "sev", header: t("severity"),
      cell: (v) => <Badge className={severityColor[v.severity] + " ring-1"}>{t(v.severity)}</Badge>,
    },
    { key: "loc", header: t("location"), cell: (v) => v.location || "-" },
    { key: "plate", header: t("vehicle_plate"), cell: (v) => v.vehicle_plate || "-" },
    {
      key: "trg", header: t("triggered_status"),
      cell: (v) => v.triggered_status ? <Badge className={statusColor[v.triggered_status] + " ring-1"}>{t((`status_${v.triggered_status}`) as any)}</Badge> : "-",
    },
    {
      key: "actions", header: t("actions"),
      cell: (v) => (
        <div className="flex items-center gap-1.5">
          {canEdit && (
            <button onClick={() => openEdit(v)} title={t("edit")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-sky-300">
              <Pencil size={16} />
            </button>
          )}
          {isAdmin && (
            <button onClick={() => remove(v)} title={t("delete")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-300">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ], [t, lang, canEdit, isAdmin]);

  const selectedType = types.find((tp) => tp.id === form.violation_type_id);
  // Filter driver list by contractor if a contractor filter is set in the form modal (helpful for big lists)
  const driverOptions = drivers;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-50 flex items-center gap-2"><ShieldAlert className="text-amber-400" size={22}/> {t("violations")}</h1>
          <p className="text-sm text-slate-400">{rows.length} {t("total").toLowerCase()}</p>
        </div>
        <div className="flex items-center gap-2">
          <a href={apiDownloadUrl("/api/reports/violations.xlsx")} target="_blank" rel="noreferrer"
             className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs text-slate-100 hover:bg-slate-800">
            <Download size={14} /> {t("export_excel")}
          </a>
          {canEdit && <Button icon={<Plus size={16} />} onClick={openCreate}>{t("add_violation")}</Button>}
        </div>
      </div>

      <Card>
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Select value={filterContractor} onChange={(e) => setFilterContractor(e.target.value === "" ? "" : Number(e.target.value))}>
            <option value="">{t("filter_by_contractor")}</option>
            {contractors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select value={filterDriver} onChange={(e) => setFilterDriver(e.target.value === "" ? "" : Number(e.target.value))}>
            <option value="">{t("filter_by_driver")}</option>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
          </Select>
          <Select value={filterType} onChange={(e) => setFilterType(e.target.value === "" ? "" : Number(e.target.value))}>
            <option value="">{t("filter_by_type")}</option>
            {types.map((tp) => <option key={tp.id} value={tp.id}>{lang === "ar" ? tp.name_ar : tp.name_en}</option>)}
          </Select>
          <Select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value as Severity | "")}>
            <option value="">{t("filter_by_severity")}</option>
            <option value="minor">{t("minor")}</option>
            <option value="major">{t("major")}</option>
            <option value="critical">{t("critical")}</option>
          </Select>
          <Input type="datetime-local" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} placeholder={t("date_from")} />
          <Input type="datetime-local" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} placeholder={t("date_to")} />
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={refresh}>{t("apply")}</Button>
          <Button variant="ghost" onClick={() => {
            setFilterContractor(""); setFilterDriver(""); setFilterType("");
            setFilterSeverity(""); setFilterFrom(""); setFilterTo("");
            setTimeout(refresh, 0);
          }}>{t("reset_filters")}</Button>
        </div>
      </Card>

      <Table columns={cols} rows={rows} loading={loading} empty={t("no_data")} />

      <Modal
        open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? t("edit_violation") : t("add_violation")}
        size="lg"
        footer={<>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>{t("cancel")}</Button>
          <Button onClick={submit} loading={submitting}>{t("save")}</Button>
        </>}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Select label={t("driver")} value={form.driver_id ?? ""} onChange={(e) => setForm({ ...form, driver_id: e.target.value === "" ? undefined : Number(e.target.value) })}>
            <option value="">{t("select_driver")}</option>
            {driverOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.full_name}{d.contractor_name ? ` — ${d.contractor_name}` : ""}
              </option>
            ))}
          </Select>
          <Select label={t("violation_type")} value={form.violation_type_id ?? ""} onChange={(e) => {
            const id = e.target.value === "" ? undefined : Number(e.target.value);
            const tp = types.find((t) => t.id === id);
            setForm({ ...form, violation_type_id: id, severity: tp?.default_severity ?? form.severity });
          }}>
            <option value="">{t("select_type")}</option>
            {types.map((tp) => (
              <option key={tp.id} value={tp.id}>
                {lang === "ar" ? tp.name_ar : tp.name_en}{tp.instant_ban ? " (Instant Ban)" : ""}
              </option>
            ))}
          </Select>
          {selectedType?.instant_ban && (
            <div className="md:col-span-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {lang === "ar"
                ? "تنبيه: هذا النوع من المخالفات يؤدي إلى حظر فوري للسائق من حقل غرب القرنة."
                : "Warning: This violation type will INSTANTLY BAN the driver from West Qurna field."}
            </div>
          )}
          <Select label={t("severity")} value={form.severity ?? ""} onChange={(e) => setForm({ ...form, severity: e.target.value as Severity })}>
            <option value="">{t("default_severity")}</option>
            <option value="minor">{t("minor")}</option>
            <option value="major">{t("major")}</option>
            <option value="critical">{t("critical")}</option>
          </Select>
          <Input type="datetime-local" label={t("occurred_at")} value={form.occurred_at} onChange={(e) => setForm({ ...form, occurred_at: e.target.value })} />
          <Input label={t("location")} value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          <Input label={t("vehicle_plate")} value={form.vehicle_plate || ""} onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value })} />
          <Input type="number" label={t("speed_kmh")} value={form.speed_kmh ?? ""} onChange={(e) => setForm({ ...form, speed_kmh: e.target.value === "" ? undefined : Number(e.target.value) })} />
          <Input label={t("reported_by")} value={form.reported_by || ""} onChange={(e) => setForm({ ...form, reported_by: e.target.value })} />
          <Input label={t("attachment_url")} value={form.attachment_url || ""} onChange={(e) => setForm({ ...form, attachment_url: e.target.value })} />
          <div className="md:col-span-2">
            <Textarea label={t("description")} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
