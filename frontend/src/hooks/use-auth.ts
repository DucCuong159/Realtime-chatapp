import { API } from "@/lib/axios-client";
import { clearAuthSessionCache } from "@/lib/query-client";
import type { LoginType, RegisterType, UserType } from "@/types/auth.type";
import type { ProfileFormType } from "@/validators/user.validator";
import { toast } from "sonner";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSocket } from "./use-socket";

interface AuthState {
  user: UserType | null;
  isLoggingIn: boolean;
  isSigningUp: boolean;
  isAuthStatusLoading: boolean;
  isUpdatingProfile: boolean;
  isInitialized: boolean;

  register: (data: RegisterType) => Promise<void>;
  login: (data: LoginType) => Promise<void>;
  logout: () => Promise<void>;
  isAuthStatus: () => Promise<void>;
  updateProfile: (data: ProfileFormType) => Promise<boolean>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isSigningUp: false,
      isLoggingIn: false,
      isAuthStatusLoading: false,
      isUpdatingProfile: false,
      isInitialized: false,

      register: async (data: RegisterType) => {
        set({ isSigningUp: true });
        try {
          const response = await API.post("/auth/register", data);
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
          const response = await API.post("/auth/login", data);
          if (response.status === 200) set({ user: response.data.user });
          useSocket.getState().connectSocket();
          toast.success("Logged in successfully");
        } finally {
          set({ isLoggingIn: false });
        }
      },
      logout: async () => {
        try {
          await API.post("/auth/logout");
          toast.success("Logged out successfully");
        } catch {
          // handle error in interceptor
        } finally {
          await clearAuthSessionCache();
          set({ user: null });
          useSocket.getState().disconnectSocket();
        }
      },
      isAuthStatus: async () => {
        set({ isAuthStatusLoading: true });
        try {
          const response = await API.get("/auth/status");
          if (response.status === 200) set({ user: response.data.user });
          useSocket.getState().connectSocket();
          toast.success("Authenticated successfully");
        } catch {
          await clearAuthSessionCache();
          set({ user: null });
          useSocket.getState().disconnectSocket();
        } finally {
          set({ isAuthStatusLoading: false, isInitialized: true });
        }
      },
      updateProfile: async (data: ProfileFormType): Promise<boolean> => {
        set({ isUpdatingProfile: true });
        try {
          const response = await API.put("/user/profile", data);
          if (response.status === 200 && response.data.user) {
            set({ user: response.data.user });
            toast.success("Profile updated successfully");
            return true;
          }
          return false;
        } catch {
          return false;
        } finally {
          set({ isUpdatingProfile: false });
        }
      },
    }),
    {
      name: "app:root",
      partialize: (state) => ({ user: state.user }),
    },
  ),
);

// Clear the entire query cache whenever the authenticated user identity changes
// (e.g. login, logout, account switch) to prevent cross-account cache leaks.
let previousUserId = useAuth.getState().user?._id ?? null;
useAuth.subscribe((state) => {
  const currentUserId = state.user?._id ?? null;
  if (currentUserId !== previousUserId) {
    previousUserId = currentUserId;
    void clearAuthSessionCache();
  }
});

