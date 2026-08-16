import { HTTPSTATUS } from "@/config/http.config";
import type { ApiErrorResponse } from "@/types/api.type";
import axios from "axios";
import { toast } from "sonner";

export const API = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? import.meta.env.VITE_API_URL
      : "/api",
  withCredentials: true,
});

/**
 * Extract a human-readable error message from an unknown error.
 * Uses the typed ApiErrorResponse from our backend contract.
 */
export const getApiErrorMessage = (
  error: unknown,
  fallback = "Something went wrong!",
): string => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    // Validation errors (Zod) — show the first field error
    const data = error.response?.data;
    if (data?.errors?.length) {
      return data.errors.map((e) => e.message).join(", ");
    }
    // AppError / generic backend error
    if (data?.message) {
      return data.message;
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
};

// ─── Response interceptor ────────────────────────────────────────────
API.interceptors.response.use(
  (response) => response,
  (error) => {
    // No response at all — network error or server is down
    if (axios.isAxiosError(error) && !error.response) {
      toast.error(
        "Unable to connect to the server. Please check your network connection!",
      );
      return Promise.reject(error);
    }

    switch (error.response?.status) {
      case HTTPSTATUS.UNAUTHORIZED:
        break;
      case HTTPSTATUS.FORBIDDEN:
        toast.error("You do not have permission to perform this action!");
        break;
      case HTTPSTATUS.TOO_MANY_REQUESTS:
        toast.error("Too many requests. Please try again later!");
        break;
      case HTTPSTATUS.INTERNAL_SERVER_ERROR:
      case HTTPSTATUS.BAD_GATEWAY:
      case HTTPSTATUS.SERVICE_UNAVAILABLE:
        toast.error("Internal server error. Please try again later!");
        break;
      default:
        // 400, 404, 409, etc. — show the backend message
        toast.error(getApiErrorMessage(error));
        break;
    }

    return Promise.reject(error);
  },
);
