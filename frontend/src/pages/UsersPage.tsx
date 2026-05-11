import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { usersApi } from "../api/endpoints";
import type { User, UserRole } from "../types";
import { Button } from "../components/Button";
import { Input, Select, Switch } from "../components/Input";
import { Modal } from "../components/Modal";
import { Table, type Column } from "../components/Table";
import { Badge } from "../components/Badge";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { formatDate } from "../utils/format";

interface FormState {
  username: string;
  password: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
}
const emptyForm: FormState = { username: "", password: "", full_name: "", email: "", role: "viewer", is_active: true };

export function UsersPage() {
  const { t } = useI18n();
  const { user: currentUser } = useAuth();
  const { show } = useToast();

  const [rows, setRows] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    setLoading(true);
    try { setRows(await usersApi.list()); }
    catch (e: any) { show("error", e?.response?.data?.detail || "Load failed"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);

  function openCreate() { setEditing(null); setForm(emptyForm); setModalOpen(true); }
  function openEdit(u: User) {
    setEditing(u);
    setForm({
      username: u.username, password: "",
      full_name: u.full_name, email: u.email || "",
      role: u.role, is_active: u.is_active,
    });
    setModalOpen(true);
  }
  async function submit() {
    setSubmitting(true);
    try {
      if (editing) {
        const payload: any = {
          full_name: form.full_name, email: form.email || null, role: form.role, is_active: form.is_active,
        };
        if (form.password) payload.password = form.password;
        await usersApi.update(editing.id, payload);
        show("success", "User updated");
      } else {
        await usersApi.create({
          username: form.username, password: form.password,
          full_name: form.full_name, email: form.email || undefined,
          role: form.role, is_active: form.is_active,
        });
        show("success", "User added");
      }
      setModalOpen(false);
      await refresh();
    } catch (e: any) { show("error", e?.response?.data?.detail || "Save failed"); }
    finally { setSubmitting(false); }
  }
  async function remove(u: User) {
    if (!confirm(t("delete_confirm"))) return;
    try {
      await usersApi.remove(u.id);
      show("success", "Deleted");
      await refresh();
    } catch (e: any) { show("error", e?.response?.data?.detail || "Delete failed"); }
  }

  const roleLabel = (r: UserRole) => r === "admin" ? t("role_admin") : r === "data_entry" ? t("role_data_entry") : t("role_viewer");

  const cols: Column<User>[] = useMemo(() => [
    {
      key: "u", header: t("user"),
      cell: (u) => (
        <div>
          <div className="font-medium text-slate-100">{u.full_name || u.username}</div>
          <div className="text-xs text-slate-400">@{u.username}{u.email ? ` · ${u.email}` : ""}</div>
        </div>
      ),
    },
    {
      key: "role", header: t("role"),
      cell: (u) => {
        const colors = {
          admin: "bg-indigo-500/15 text-indigo-300 ring-indigo-500/30",
          data_entry: "bg-sky-500/15 text-sky-300 ring-sky-500/30",
          viewer: "bg-slate-500/15 text-slate-300 ring-slate-500/30",
        } as const;
        return <Badge className={colors[u.role] + " ring-1"}>{roleLabel(u.role)}</Badge>;
      },
    },
    {
      key: "active", header: t("status"),
      cell: (u) => u.is_active
        ? <Badge className="bg-emerald-500/10 text-emerald-300 ring-emerald-500/30 ring-1">{t("active")}</Badge>
        : <Badge className="bg-slate-700/30 text-slate-300 ring-slate-600/30 ring-1">{t("inactive")}</Badge>,
    },
    { key: "created", header: t("created_at"), cell: (u) => formatDate(u.created_at, false) },
    {
      key: "actions", header: t("actions"),
      cell: (u) => (
        <div className="flex items-center gap-1.5">
          <button onClick={() => openEdit(u)} title={t("edit")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-sky-300">
            <Pencil size={16} />
          </button>
          {currentUser?.id !== u.id && (
            <button onClick={() => remove(u)} title={t("delete")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-300">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ], [t, currentUser]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-50">{t("users")}</h1>
          <p className="text-sm text-slate-400">{rows.length} {t("total").toLowerCase()}</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openCreate}>{t("add_user")}</Button>
      </div>

      <Table columns={cols} rows={rows} loading={loading} empty={t("no_data")} />

      <Modal
        open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? t("edit_user") : t("add_user")}
        footer={<>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>{t("cancel")}</Button>
          <Button onClick={submit} loading={submitting}>{t("save")}</Button>
        </>}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Input label={t("username")} disabled={!!editing} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <Input label={t("password")} type="password" placeholder={editing ? "(leave blank to keep)" : ""} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} hint="Min 8 characters" />
          <Input label={t("full_name")} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <Input label={t("email")} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Select label={t("role")} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
            <option value="admin">{t("role_admin")}</option>
            <option value="data_entry">{t("role_data_entry")}</option>
            <option value="viewer">{t("role_viewer")}</option>
          </Select>
          <div className="flex items-end pb-1">
            <Switch checked={form.is_active} onChange={(v) => setForm({ ...form, is_active: v })} label={t("active")} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
