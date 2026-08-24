import { HTTPSTATUS } from "@/config/http.config";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";
import type { ApiErrorResponse } from "@/types/api.type";
import axios from "axios";
import { toast } from "sonner";

// ─── Constants ───────────────────────────────────────────────────────
const BASE_URL =
  import.meta.env.MODE === "development"
    ? `${import.meta.env.VITE_API_URL || "http://localhost:8080"}/api`
    : "/api";

const AUTH_ROUTES = [
  "auth/status",
  "auth/login",
  "auth/register",
  "auth/logout",
];

// ─── Helper Functions ────────────────────────────────────────────────
const trimSlashes = (str: string): string => {
  let start = 0;
  let end = str.length;
  while (start < end && str[start] === "/") start++;
  while (end > start && str[end - 1] === "/") end--;
  return str.slice(start, end);
};

const normalizePath = (rawUrl: string): string => {
  try {
    const parsed = new URL(rawUrl, "http://localhost");
    return trimSlashes(parsed.pathname);
  } catch {
    const pathOnly = rawUrl.split("?")[0].split("#")[0];
    return trimSlashes(pathOnly);
  }
};

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

// ─── Axios Instance ──────────────────────────────────────────────────
export const API = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// ─── Request Interceptor ─────────────────────────────────────────────
API.interceptors.request.use((config) => {
  const socket = useSocket.getState().socket;
  const user = useAuth.getState().user;
  if (socket?.id && user?._id) {
    config.headers.set("x-socket-id", socket.id);
  }
  return config;
});

// ─── Response Interceptor ────────────────────────────────────────────
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
      case HTTPSTATUS.UNAUTHORIZED: {
        const pathname = normalizePath(error.config?.url || "");
        const isAuthRoute = AUTH_ROUTES.includes(pathname);
        if (!isAuthRoute) {
          useAuth.getState().logout();
        } else if (pathname !== "auth/status") {
          toast.error(getApiErrorMessage(error));
        }
        break;
      }
      case HTTPSTATUS.FORBIDDEN:
        toast.error("You do not have permission to perform this action!");
        break;
      case HTTPSTATUS.TOO_MANY_REQUESTS:
        toast.error(
          getApiErrorMessage(
            error,
            "Login limit reached (maximum 5 attempts).",
          ),
        );
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
