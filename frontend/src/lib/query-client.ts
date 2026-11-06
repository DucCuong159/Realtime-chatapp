import { QueryClient } from "@tanstack/react-query";

/**
 * Global QueryClient instance with sane defaults for real-time messaging:
 * - staleTime: 60s (prevents aggressive refetching while user is chatting)
 * - gcTime: 5m (garbage collects unused caches to keep client memory minimal)
 * - refetchOnWindowFocus: false (avoids jarring reloads during socket-driven chat)
 * - retry: 1 (fast failover on network blips)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

declare global {
  interface Window {
    __TANSTACK_QUERY_CLIENT__?: QueryClient;
    queryClient?: QueryClient;
  }
}

// Connect to TanStack Query DevTools browser extension & console in development
if (typeof window !== "undefined") {
  window.__TANSTACK_QUERY_CLIENT__ = queryClient;
  if (import.meta.env.DEV) {
    window.queryClient = queryClient;
  }
}

