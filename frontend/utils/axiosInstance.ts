import axios, { AxiosInstance } from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;
const timeout = Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 10000;
const endpointCooldowns = new Map<string, number>();

const getRequestKey = (method?: string, url?: string) =>
  `${String(method || "get").toUpperCase()}:${String(url || "")}`;

const axiosInstance: AxiosInstance = axios.create({
  baseURL,
  timeout,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor – attach token
axiosInstance.interceptors.request.use(
  (config) => {
    const key = getRequestKey(config.method, config.url);
    const cooldownUntil = endpointCooldowns.get(key) || 0;

    if (Date.now() < cooldownUntil) {
      const secondsLeft = Math.max(1, Math.ceil((cooldownUntil - Date.now()) / 1000));
      return Promise.reject(new Error(`Rate limit active. Please retry in ${secondsLeft}s.`));
    }

    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor – handle 403
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestConfig = error.config || {};
    const key = getRequestKey(requestConfig.method, requestConfig.url);

    if (status === 429) {
      const retryAfterHeader = Number(error.response?.headers?.["retry-after"] || 0);
      const retryAfterBody = Number(error.response?.data?.retryAfter || 0);
      const retryAfterSeconds = retryAfterHeader || retryAfterBody || 30;
      endpointCooldowns.set(key, Date.now() + retryAfterSeconds * 1000);
    }

    if (status === 403) {
      console.warn("Token expired or forbidden. Redirecting to login...");

      if (typeof window !== "undefined") {
        localStorage.removeItem("token"); // optional but recommended
        localStorage.removeItem("user");
        window.location.href = "/"; // login route
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
