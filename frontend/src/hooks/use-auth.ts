import { API } from "@/lib/axios-client";
import type { LoginType, RegisterType, UserType } from "@/types/auth.type";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSocket } from "./use-socket";
import { toast } from "sonner";

interface AuthState {
  user: UserType | null;
  isLoggingIn: boolean;
  isSigningUp: boolean;
  isAuthStatusLoading: boolean;

  register: (data: RegisterType) => Promise<void>;
  login: (data: LoginType) => Promise<void>;
  logout: () => Promise<void>;
  isAuthStatus: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isSigningUp: false,
      isLoggingIn: false,
      isAuthStatusLoading: false,

      register: async (data: RegisterType) => {
        set({ isSigningUp: true });
        try {
          const response = await API.post("api/auth/register", data);
          if (response.status === 201) set({ user: response.data.user });
          useSocket.getState().connectSocket();
          toast.success("Registered successfully");
        } finally {
          set({ isSigningUp: false });
        }
      },
      login: async (data: LoginType) => {
        set({ isLoggingIn: true });
        try {
          const response = await API.post("api/auth/login", data);
          if (response.status === 200) set({ user: response.data.user });
          useSocket.getState().connectSocket();
          toast.success("Logged in successfully");
        } finally {
          set({ isLoggingIn: false });
        }
      },
      logout: async () => {
        try {
          await API.post("api/auth/logout");
          toast.success("Logged out successfully");
        } finally {
          set({ user: null });
          useSocket.getState().disconnectSocket();
        }
      },
      isAuthStatus: async () => {
        set({ isAuthStatusLoading: true });
        try {
          const response = await API.get("api/auth/status");
          if (response.status === 200) set({ user: response.data.user });
          useSocket.getState().connectSocket();
          toast.success("Authenticated successfully");
        } finally {
          set({ isAuthStatusLoading: false });
        }
      },
    }),
    { name: "app:root" },
  ),
);
