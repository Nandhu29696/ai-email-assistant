import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

// Attach stored JWT to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("mail-ai-auth");
      if (raw) {
        const parsed = JSON.parse(raw);
        const token: string | undefined = parsed?.state?.user?.access_token;
        if (token) {
          config.headers["Authorization"] = `Bearer ${token}`;
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  return config;
});

// Propagate FastAPI error detail; redirect to /login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const detail = err.response?.data?.detail;
    if (detail) {
      err.message = typeof detail === "string" ? detail : JSON.stringify(detail);
    }
    if (err.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("mail-ai-auth");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;
