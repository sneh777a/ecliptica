import axios from "axios";

/** Single place for backend base URL */
export const API_URL = "https://ecliptica-api.onrender.com";

/** Turn FastAPI / network errors into a safe string for UI */
export function formatApiError(err, fallback = "Something went wrong") {
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
export function createApi(token) {
  return axios.create({
    baseURL: API_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}
