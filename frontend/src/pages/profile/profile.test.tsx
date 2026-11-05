import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import ProfilePage from "./index";
import { useAuth } from "@/hooks/use-auth";

vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(),
}));

describe("ProfilePage component (TDD)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: {
        _id: "user_test_123",
        name: "John Doe",
        email: "john@example.com",
        avatar: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        about: "Hello! Passionate developer.",
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
  });

  it("renders profile settings with user information", () => {
    const html = renderToString(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(html).toContain("Account Settings");
    expect(html).toContain("john@example.com");
    expect(html).toContain("John Doe");
    expect(html).toContain("Hello! Passionate developer.");
    expect(html).toContain("Save Changes");
    expect(html).toContain("Back to conversations");
  });

  it("displays loading spinner when isUpdatingProfile is true", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: {
        _id: "user_test_123",
        name: "John Doe",
        email: "john@example.com",
        avatar: null,
        about: "",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
      logout: vi.fn(),
      isLoggingIn: false,
      isSigningUp: false,
      isAuthStatusLoading: false,
      isUpdatingProfile: true,
      isInitialized: true,
      register: vi.fn(),
      login: vi.fn(),
      isAuthStatus: vi.fn(),
      updateProfile: vi.fn(),
    });

    const html = renderToString(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>,
    );

    expect(html).toContain("Saving...");
  });
});
