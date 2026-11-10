import { userKeys } from "@/constants/query-keys";
import { API } from "@/lib/axios-client";
import { createMockUser } from "@/test/test-fixtures";
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchUsers, useUsers } from "./use-users";

vi.mock("@/lib/axios-client", () => ({
  API: {
    get: vi.fn(),
  },
}));

describe("useUsers spec (TanStack Query v5)", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it("exports useUsers hook function", () => {
    expect(typeof useUsers).toBe("function");
  });

  it("fetches user directory from /user/all via production fetchUsers", async () => {
    const mockUsers = [createMockUser({ _id: "u1", name: "Alice" })];
    vi.mocked(API.get).mockResolvedValueOnce({
      data: { users: mockUsers },
    });

    const data = await queryClient.fetchQuery({
      queryKey: userKeys.lists(),
      queryFn: fetchUsers,
    });

    expect(data).toEqual(mockUsers);
    expect(API.get).toHaveBeenCalledWith("/user/all");
  });
});
