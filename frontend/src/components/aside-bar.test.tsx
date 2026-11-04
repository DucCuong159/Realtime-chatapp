import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import AsideBar from "./aside-bar";
import { useAuth } from "@/hooks/use-auth";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/use-is-user-online", () => ({
  useIsUserOnline: () => true,
}));

vi.mock("./theme-provider", () => ({
  useTheme: () => ({ theme: "light", toggleTheme: vi.fn() }),
}));

describe("AsideBar component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders aside bar with logo and account trigger with user initial when no avatar", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        _id: "user123",
        name: "Antigravity Dev",
        email: "dev@antigravity.test",
        avatar: null,
        about: "Building awesome apps",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
      logout: vi.fn(),
      isLoggingIn: false,
      isSigningUp: false,
      isAuthStatusLoading: false,
      isUpdatingProfile: false,
      isInitialized: true,
      register: vi.fn(),
      login: vi.fn(),
      isAuthStatus: vi.fn(),
      updateProfile: vi.fn(),
    });

    const html = renderToString(
      <MemoryRouter>
        <AsideBar />
      </MemoryRouter>,
    );

    expect(html).toContain("Account menu");
    expect(html).toContain("Toggle theme");
    expect(html).toContain(">A<");
  });

  it("renders aside bar with online indicator when user is online", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        _id: "user123",
        name: "Cuong Dev",
        email: "cuong@antigravity.test",
        avatar: "https://example.com/avatar.png",
        about: "Building awesome apps",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
      logout: vi.fn(),
      isLoggingIn: false,
      isSigningUp: false,
      isAuthStatusLoading: false,
      isUpdatingProfile: false,
      isInitialized: true,
      register: vi.fn(),
      login: vi.fn(),
      isAuthStatus: vi.fn(),
      updateProfile: vi.fn(),
    });

    const html = renderToString(
      <MemoryRouter>
        <AsideBar />
      </MemoryRouter>,
    );

    expect(html).toContain("bg-green-500");
    expect(html).toContain(">C<");
  });
});
