import axiosInstance from "./axiosInstance";
import { AxiosRequestConfig, Method, AxiosError } from "axios";

export interface ApiRequest<T = any> {
  url: string;
  method?: Method;
  data?: T;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  isFormData?: boolean;
  timeout?: number;
  responseType?: AxiosRequestConfig["responseType"];
}

export type ApiResponse<T = any> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: any;
  [key: string]: any;
};

export async function apiClient<TResponse = any, TRequest = any>({
  url,
  method = "GET",
  data,
  params,
  headers = {},
  isFormData = false,
  timeout,
  responseType,
}: ApiRequest<TRequest>): Promise<ApiResponse<TResponse>> {
  try {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("token")
        : null;

    const config: AxiosRequestConfig = {
      url,
      method,
      data,
      params,
      timeout,
      responseType,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...headers,
      },
    };

    if (isFormData) {
      delete config.headers?.["Content-Type"];
      delete config.headers?.["content-type"];
    }

    const response = await axiosInstance(config);

    return response.data;
  } catch (error) {
    const err = error as AxiosError<any>;

    // 🔥 Backend error (4xx, 5xx)
    if (err.response) {
      return err.response.data || {
        success: false,
        message: "An error occurred while processing your request.",
      };
    }

    // 🔥 Network error
    if (err.request) {
      if (err.code === "ECONNABORTED") {
        return {
          success: false,
          message: "Upload is taking longer than expected. Please try again with fewer rows or contact support if it keeps happening.",
        };
      }

      return {
        success: false,
        message: "Network error. Please check your internet connection.",
      };
    }

    // 🔥 Unknown error
    return {
      success: false,
      message: err.message || "Unexpected error occurred",
    };
  }
}
