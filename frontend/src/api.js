import axios from "axios";

/** Single place for backend base URL */
export const API_URL = "https://ecliptica-api.onrender.com";

/** Turn FastAPI / network errors into a safe string for UI */
export function formatApiError(err, fallback = "Something went wrong") {
  if (err?.code === "ECONNABORTED" || /timeout/i.test(err?.message || "")) {
    return "Request timed out. The API may be waking up — wait 30s and try again.";
  }
  if (err?.message === "Network Error") {
    return "Network error. Open https://ecliptica-api.onrender.com once, wait for it to load, then retry.";
  }
  const detail = err?.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((e) => e.msg || JSON.stringify(e)).join(", ");
  }
  if (typeof detail === "string") return detail;
  if (detail && typeof detail === "object") return JSON.stringify(detail);
  if (err?.message) return err.message;
  return fallback;
}

/** Axios instance; pass JWT when calling protected routes */
export function createApi(token, timeoutMs = 60000) {
  return axios.create({
    baseURL: API_URL,
    timeout: timeoutMs,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
