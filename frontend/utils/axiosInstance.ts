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

// Optional: Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Example: add token dynamically
    const token = typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Optional: Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default axiosInstance;
