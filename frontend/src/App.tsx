import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { I18nProvider } from "./i18n/I18nContext";
import { ToastProvider } from "./components/Toast";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DriversPage } from "./pages/DriversPage";
import { ContractorsPage } from "./pages/ContractorsPage";
import { ViolationsPage } from "./pages/ViolationsPage";
import { ViolationTypesPage } from "./pages/ViolationTypesPage";
import { UsersPage } from "./pages/UsersPage";
import { AuditPage } from "./pages/AuditPage";

function RequireAuth({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) {
  const { token, user } = useAuth();
  const loc = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (adminOnly && user?.role !== "admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  if (token) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
              <Route element={<RequireAuth><Layout /></RequireAuth>}>
                <Route index element={<DashboardPage />} />
                <Route path="drivers" element={<DriversPage />} />
                <Route path="contractors" element={<ContractorsPage />} />
                <Route path="violations" element={<ViolationsPage />} />
                <Route path="violation-types" element={<ViolationTypesPage />} />
                <Route path="users" element={<RequireAuth adminOnly><UsersPage /></RequireAuth>} />
                <Route path="audit" element={<RequireAuth adminOnly><AuditPage /></RequireAuth>} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
