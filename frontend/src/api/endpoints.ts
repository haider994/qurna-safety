import { api } from "./client";
import type {
  AuditEntry,
  AuthResponse,
  Contractor,
  DashboardData,
  Driver,
  DriverStatus,
  User,
  Violation,
  ViolationType,
  Severity,
} from "../types";

// ---- Auth ----
export const authApi = {
  login: (username: string, password: string) =>
    api.post<AuthResponse>("/api/auth/login", { username, password }).then((r) => r.data),
  me: () => api.get<User>("/api/auth/me").then((r) => r.data),
};

// ---- Users ----
export const usersApi = {
  list: () => api.get<User[]>("/api/users").then((r) => r.data),
  create: (data: { username: string; password: string; full_name?: string; email?: string; role: User["role"]; is_active?: boolean }) =>
    api.post<User>("/api/users", data).then((r) => r.data),
  update: (id: number, data: Partial<{ password: string; full_name: string; email: string | null; role: User["role"]; is_active: boolean }>) =>
    api.patch<User>(`/api/users/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/api/users/${id}`).then((r) => r.data),
};

// ---- Contractors ----
export const contractorsApi = {
  list: (params?: { q?: string; include_inactive?: boolean }) =>
    api.get<Contractor[]>("/api/contractors", { params }).then((r) => r.data),
  get: (id: number) => api.get<Contractor>(`/api/contractors/${id}`).then((r) => r.data),
  create: (data: Partial<Contractor> & { name: string }) =>
    api.post<Contractor>("/api/contractors", data).then((r) => r.data),
  update: (id: number, data: Partial<Contractor>) =>
    api.patch<Contractor>(`/api/contractors/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/api/contractors/${id}`).then((r) => r.data),
};

// ---- Drivers ----
export const driversApi = {
  list: (params?: { q?: string; contractor_id?: number; status_filter?: DriverStatus; include_inactive?: boolean }) =>
    api.get<Driver[]>("/api/drivers", { params }).then((r) => r.data),
  get: (id: number) => api.get<Driver>(`/api/drivers/${id}`).then((r) => r.data),
  create: (data: Partial<Driver> & { full_name: string }) =>
    api.post<Driver>("/api/drivers", data).then((r) => r.data),
  update: (id: number, data: Partial<Driver>) =>
    api.patch<Driver>(`/api/drivers/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/api/drivers/${id}`).then((r) => r.data),
  reinstate: (id: number) => api.post<Driver>(`/api/drivers/${id}/reinstate`).then((r) => r.data),
};

// ---- Violation Types ----
export const violationTypesApi = {
  list: (params?: { include_inactive?: boolean }) =>
    api.get<ViolationType[]>("/api/violation-types", { params }).then((r) => r.data),
  create: (data: Omit<ViolationType, "id" | "created_at">) =>
    api.post<ViolationType>("/api/violation-types", data).then((r) => r.data),
  update: (id: number, data: Partial<ViolationType>) =>
    api.patch<ViolationType>(`/api/violation-types/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/api/violation-types/${id}`).then((r) => r.data),
};

// ---- Violations ----
export interface ViolationFilters {
  q?: string;
  driver_id?: number;
  contractor_id?: number;
  violation_type_id?: number;
  severity?: Severity;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}
export const violationsApi = {
  list: (params?: ViolationFilters) =>
    api.get<Violation[]>("/api/violations", { params }).then((r) => r.data),
  get: (id: number) => api.get<Violation>(`/api/violations/${id}`).then((r) => r.data),
  create: (data: {
    driver_id: number;
    violation_type_id: number;
    severity?: Severity;
    occurred_at: string;
    location?: string;
    vehicle_plate?: string;
    speed_kmh?: number;
    description?: string;
    attachment_url?: string;
    reported_by?: string;
  }) => api.post<Violation>("/api/violations", data).then((r) => r.data),
  update: (id: number, data: Partial<Violation>) =>
    api.patch<Violation>(`/api/violations/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/api/violations/${id}`).then((r) => r.data),
};

// ---- Dashboard ----
export const dashboardApi = {
  get: () => api.get<DashboardData>("/api/dashboard").then((r) => r.data),
};

// ---- Audit ----
export const auditApi = {
  list: (params?: { action?: string; entity_type?: string; username?: string; limit?: number; offset?: number }) =>
    api.get<AuditEntry[]>("/api/audit", { params }).then((r) => r.data),
};
