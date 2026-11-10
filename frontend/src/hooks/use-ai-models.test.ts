import { aiKeys } from "@/constants/query-keys";
import { API } from "@/lib/axios-client";
import type { AIModelInfo, AIModelsApiResponse } from "@/types/ai.type";
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchAiModels,
  refreshAiModels,
  resolveEffectiveModelId,
  resolveSelectedModel,
  useAiModels,
  useAiPreferenceStore,
} from "./use-ai-models";

vi.mock("@/lib/axios-client", () => ({
  API: {
    get: vi.fn(),
  },
  getApiErrorMessage: vi.fn(
    (_err: unknown, defaultMsg: string) => defaultMsg,
  ),
}));

const mockModelFlash: AIModelInfo = {
  id: "gemini-2.5-flash",
  name: "Gemini 2.5 Flash",
  status: "ready",
  statusBadge: "🟢 Ready",
  note: "Ready",
  isAvailable: true,
  latencyMs: 300,
};

const mockModelPro: AIModelInfo = {
  id: "gemini-2.5-pro",
  name: "Gemini 2.5 Pro",
  status: "quota_exceeded",
  statusBadge: "🔴 429 Limit",
  note: "Quota Exceeded",
  isAvailable: false,
};

const mockApiResponse: AIModelsApiResponse = {
  message: "AI models retrieved successfully",
  models: [mockModelFlash, mockModelPro],
  cachedAt: "2026-11-10T00:00:00.000Z",
};

describe("useAiModels spec (TanStack Query v5)", () => {
  let queryClient: QueryClient;
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        for (const k of Object.keys(mockStorage)) delete mockStorage[k];
      }),
    });
    useAiPreferenceStore.setState({ selectedModelId: "gemini-2.5-flash" });
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  it("exports useAiModels hook function", () => {
    expect(typeof useAiModels).toBe("function");
  });

  it("fetches AI models from /ai/models via production fetchAiModels", async () => {
    vi.mocked(API.get).mockResolvedValueOnce({
      data: mockApiResponse,
    });

    const data = await queryClient.fetchQuery({
      queryKey: aiKeys.models(),
      queryFn: () => fetchAiModels(false),
    });

    expect(data).toEqual(mockApiResponse);
    expect(API.get).toHaveBeenCalledWith("/ai/models");
  });

  it("fetches AI models from /ai/models?refresh=true when forceRefresh is true", async () => {
    vi.mocked(API.get).mockResolvedValueOnce({
      data: mockApiResponse,
    });

    const data = await fetchAiModels(true);

    expect(data).toEqual(mockApiResponse);
    expect(API.get).toHaveBeenCalledWith("/ai/models?refresh=true");
  });

  it("updates selectedModelId and persists to localStorage in useAiPreferenceStore", () => {
    expect(useAiPreferenceStore.getState().selectedModelId).toBe("gemini-2.5-flash");

    useAiPreferenceStore.getState().setSelectedModelId("gemini-2.5-pro");

    expect(useAiPreferenceStore.getState().selectedModelId).toBe("gemini-2.5-pro");
    expect(localStorage.getItem("chat_selected_ai_model")).toBe("gemini-2.5-pro");
  });

  it("resolves selected model to active model if available", () => {
    const selected = resolveSelectedModel(
      [mockModelFlash, mockModelPro],
      "gemini-2.5-flash",
    );
    expect(selected?.id).toBe("gemini-2.5-flash");
  });

  it("falls back to first available model if selected model is quota exceeded or unavailable", () => {
    const selected = resolveSelectedModel(
      [mockModelFlash, mockModelPro],
      "gemini-2.5-pro",
    );
    expect(selected?.id).toBe("gemini-2.5-flash");
  });

  it("resolves effective model id falling back when selection is unavailable", () => {
    const effectiveId = resolveEffectiveModelId(
      [mockModelFlash, mockModelPro],
      "gemini-2.5-pro",
    );
    expect(effectiveId).toBe("gemini-2.5-flash");
  });

  it("refreshes AI models and writes to TanStack Query cache via refreshAiModels", async () => {
    const updatedResponse: AIModelsApiResponse = {
      message: "Refreshed",
      models: [{ ...mockModelFlash, name: "Updated Flash" }],
      cachedAt: "2026-11-10T01:00:00.000Z",
    };
    vi.mocked(API.get).mockResolvedValueOnce({ data: updatedResponse });

    const result = await refreshAiModels(queryClient);

    expect(result).toEqual(updatedResponse);
    expect(API.get).toHaveBeenCalledWith("/ai/models?refresh=true");

    const cached = queryClient.getQueryData<AIModelsApiResponse>(aiKeys.models());
    expect(cached?.models[0].name).toBe("Updated Flash");
  });
});
