import { beforeEach, describe, expect, it, vi } from "vitest";
import { API } from "@/lib/axios-client";
import { useAuth } from "./use-auth";

vi.mock("@/lib/axios-client", () => ({
  API: {
    put: vi.fn(),
    post: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("./use-socket", () => ({
  useSocket: {
    getState: () => ({
      connectSocket: vi.fn(),
      disconnectSocket: vi.fn(),
    }),
  },
}));

describe("useAuth updateProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.setState({
      user: {
        _id: "u123",
        name: "Old Name",
        email: "test@example.com",
        avatar: null,
        about: "Old about",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
      isUpdatingProfile: false,
    });
  });

  it("updates user state upon successful profile update", async () => {
    const updatedUser = {
      _id: "u123",
      name: "New Name",
      email: "test@example.com",
      avatar: "https://example.com/avatar.jpg",
      about: "New bio",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-02",
    };

    vi.mocked(API.put).mockResolvedValueOnce({
      status: 200,
      data: { message: "Profile updated successfully", user: updatedUser },
    });

    const result = await useAuth.getState().updateProfile({
      name: "New Name",
      about: "New bio",
    });

    expect(result).toBe(true);
    expect(API.put).toHaveBeenCalledWith("/user/profile", {
      name: "New Name",
      about: "New bio",
    });
    expect(useAuth.getState().user?.name).toBe("New Name");
    expect(useAuth.getState().user?.about).toBe("New bio");
    expect(useAuth.getState().isUpdatingProfile).toBe(false);
  });

  it("handles failure gracefully and keeps old state", async () => {
    vi.mocked(API.put).mockRejectedValueOnce(new Error("Network Error"));

    const result = await useAuth.getState().updateProfile({
      name: "Should Fail",
    });

    expect(result).toBe(false);
    expect(useAuth.getState().user?.name).toBe("Old Name");
    expect(useAuth.getState().isUpdatingProfile).toBe(false);
  });
});

