import { userKeys } from "@/constants/query-keys";
import { API } from "@/lib/axios-client";
import type { UserType } from "@/types/auth.type";
import { useQuery } from "@tanstack/react-query";

/**
 * Idiomatic TanStack Query v5 hook for user directory.
 */
export function useUsers() {
  const query = useQuery({
    queryKey: userKeys.lists(),
    queryFn: async (): Promise<UserType[]> => {
      const { data } = await API.get("/user/all");
      return data.users || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
