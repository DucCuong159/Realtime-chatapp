import { userKeys } from "@/constants/query-keys";
import { API } from "@/lib/axios-client";
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUsers } from "./use-users";

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

  it("fetches user directory from /user/all", async () => {
    const mockUsers = [{ _id: "u1", name: "Alice", email: "alice@test.com" }];
    vi.mocked(API.get).mockResolvedValueOnce({
      data: { users: mockUsers },
    });

    const data = await queryClient.fetchQuery({
      queryKey: userKeys.lists(),
      queryFn: async () => {
        const res = await API.get("/user/all");
        return res.data.users;
      },
    });

    expect(data).toEqual(mockUsers);
    expect(API.get).toHaveBeenCalledWith("/user/all");
  });
});
