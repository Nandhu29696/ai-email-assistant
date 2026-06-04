import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

// Response interceptor — propagate error message from FastAPI detail field
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const detail = err.response?.data?.detail;
    if (detail) {
      err.message = typeof detail === "string" ? detail : JSON.stringify(detail);
    }
    return Promise.reject(err);
  }
);

export default api;
