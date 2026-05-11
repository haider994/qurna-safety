import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Globe, AlertCircle, LogIn } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import { Button } from "../components/Button";
import { Input } from "../components/Input";

export function LoginPage() {
  const { login } = useAuth();
  const { t, lang, setLang } = useI18n();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
      nav("/");
    } catch {
      setError(t("invalid_credentials"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 relative overflow-hidden">
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -top-32 -end-32 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -start-32 h-96 w-96 rounded-full bg-fuchsia-700/10 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setLang(lang === "en" ? "ar" : "en")}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 backdrop-blur"
          >
            <Globe size={14} /> {t("lang_switch")}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-7 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="rounded-2xl bg-indigo-600 p-3 mb-3 shadow-lg">
              <ShieldCheck size={28} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-50">{t("app_name")}</h1>
            <p className="text-xs text-slate-400 mt-1">{t("field_name")}</p>
            <p className="text-sm text-slate-300 mt-3">{t("login_subtitle")}</p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Input
              label={t("username")}
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input
              label={t("password")}
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                <AlertCircle size={16} /> {error}
              </div>
            )}
            <Button type="submit" loading={loading} size="lg" icon={<LogIn size={18} />}>
              {t("sign_in")}
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} {t("field_name")}
        </div>
      </div>
    </div>
  );
}
