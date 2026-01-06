import axiosInstance from "./axiosInstance";
import { AxiosRequestConfig, Method } from "axios";

export interface ApiRequest<T = any> {
  url: string;
  method?: Method;
  data?: T;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  isFormData?: boolean;
}

export async function apiClient<TResponse = any, TRequest = any>({
  url,
  method = "GET",
  data,
  params,
  headers = {},
  isFormData = false,
}: ApiRequest<TRequest>): Promise<TResponse> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const config: AxiosRequestConfig = {
    url,
    method,
    data,
    params,
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
  };

  const response = await axiosInstance(config);
  return response.data;
}
