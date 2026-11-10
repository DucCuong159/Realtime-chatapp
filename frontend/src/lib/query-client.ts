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

let authSessionGeneration = 0;

/**
 * Returns the current auth session generation counter.
 */
export function getAuthSessionGeneration(): number {
  return authSessionGeneration;
}

/**
 * Checks whether the given generation counter matches the current active auth session.
 * Used by mutations to prevent writes from an earlier auth session after logout or account switch.
 */
export function isAuthSessionCurrent(generation?: number): boolean {
  return generation === undefined || generation === authSessionGeneration;
}

/**
 * Cancels all in-flight queries and immediately clears the entire query cache.
 * Advances the session generation counter so any pending mutations from the previous
 * session cannot populate the cache for the next user.
 * Must be executed on all auth changes (logout, login, identity switch, 401).
 */
export async function clearAuthSessionCache(): Promise<void> {
  authSessionGeneration++;
  await queryClient.cancelQueries();
  queryClient.clear();
}

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

