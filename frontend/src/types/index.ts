export type UserRole = "admin" | "data_entry" | "viewer";
export type DriverStatus = "active" | "notice" | "warning" | "suspended" | "banned";
export type Severity = "minor" | "major" | "critical";

export interface User {
  id: number;
  username: string;
  email: string | null;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface Contractor {
  id: number;
  name: string;
  name_ar?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  notes?: string | null;
  is_active: boolean;
  is_blacklisted: boolean;
  created_at: string;
  driver_count: number;
  violating_driver_count: number;
  total_violations: number;
}

export interface Driver {
  id: number;
  full_name: string;
  full_name_ar?: string | null;
  national_id?: string | null;
  license_number?: string | null;
  license_expiry?: string | null;
  defensive_driving_expiry?: string | null;
  nationality?: string | null;
  phone?: string | null;
  notes?: string | null;
  contractor_id?: number | null;
  contractor_name?: string | null;
  status: DriverStatus;
  is_blacklisted: boolean;
  is_active: boolean;
  created_at: string;
  violation_count: number;
}

export interface ViolationType {
  id: number;
  code: string;
  name_en: string;
  name_ar: string;
  description?: string | null;
  default_severity: Severity;
  points: number;
  instant_ban: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Violation {
  id: number;
  driver_id: number;
  driver_name?: string | null;
  contractor_id?: number | null;
  contractor_name?: string | null;
  violation_type_id: number;
  violation_type_code?: string | null;
  violation_type_name_en?: string | null;
  violation_type_name_ar?: string | null;
  severity: Severity;
  occurred_at: string;
  location?: string | null;
  vehicle_plate?: string | null;
  speed_kmh?: number | null;
  description?: string | null;
  attachment_url?: string | null;
  reported_by?: string | null;
  triggered_status?: DriverStatus | null;
  created_at: string;
}

export interface DashboardStats {
  total_drivers: number;
  total_contractors: number;
  total_violations: number;
  violations_today: number;
  violations_this_week: number;
  violations_this_month: number;
  active_drivers: number;
  banned_drivers: number;
  suspended_drivers: number;
  warning_drivers: number;
  notice_drivers: number;
}

export interface TimeBucket { bucket: string; count: number; }
export interface TopItem { id: number; name: string; count: number; extra?: string | null; }
export interface SeverityBreakdown { minor: number; major: number; critical: number; }
export interface ContractorRisk {
  contractor_id: number;
  contractor_name: string;
  driver_count: number;
  violating_driver_count: number;
  violating_percent: number;
  total_violations: number;
  is_risk: boolean;
}

export interface DashboardData {
  stats: DashboardStats;
  violations_by_day: TimeBucket[];
  violations_by_type: TopItem[];
  top_drivers: TopItem[];
  top_contractors: TopItem[];
  severity_breakdown: SeverityBreakdown;
  contractor_risk: ContractorRisk[];
}

export interface AuditEntry {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
