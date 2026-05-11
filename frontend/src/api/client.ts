import axios from "axios";

const baseURL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "";

export const api = axios.create({
  baseURL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      // Token expired or invalid - drop it. Routing layer will redirect to login.
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (!location.pathname.startsWith("/login")) {
        location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export function apiDownloadUrl(path: string): string {
  const token = localStorage.getItem("token") || "";
  const sep = path.includes("?") ? "&" : "?";
  return `${baseURL}${path}${sep}_t=${encodeURIComponent(token)}`;
}

export function fileUrl(path: string): string {
  return `${baseURL}${path}`;
}
