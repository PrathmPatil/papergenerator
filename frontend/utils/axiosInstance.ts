import axios, { AxiosInstance } from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;
const timeout = Number(process.env.NEXT_PUBLIC_API_TIMEOUT) || 10000;

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
