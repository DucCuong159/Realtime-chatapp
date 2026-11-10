import { aiKeys } from "@/constants/query-keys";
import { API, getApiErrorMessage } from "@/lib/axios-client";
import type { AIModelInfo, AIModelsApiResponse } from "@/types/ai.type";
import type { QueryClient } from "@tanstack/react-query";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { create } from "zustand";

const LOCAL_STORAGE_KEY = "chat_selected_ai_model";
const EMPTY_MODELS: AIModelInfo[] = [];

interface AIPreferenceState {
  selectedModelId: string;
  setSelectedModelId: (modelId: string) => void;
}

const getInitialSelectedModel = (): string => {
  try {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem(LOCAL_STORAGE_KEY) || "gemini-2.5-flash";
    }
    return "gemini-2.5-flash";
  } catch {
    return "gemini-2.5-flash";
  }
};

/**
 * Pure client preference store for selected AI model ID.
 * Persists user preference in localStorage without holding server state.
 */
export const useAiPreferenceStore = create<AIPreferenceState>()((set) => ({
  selectedModelId: getInitialSelectedModel(),
  setSelectedModelId: (modelId: string) => {
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_KEY, modelId);
      }
    } catch (err) {
      console.error("Failed to save selected AI model:", err);
    }
    set({ selectedModelId: modelId });
  },
}));

export interface UseAiModelsResult {
  models: AIModelInfo[];
  selectedModelId: string;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  cachedAt: string | null;
  fetchAiModels: (forceRefresh?: boolean) => Promise<void>;
  setSelectedModelId: (modelId: string) => void;
  getSelectedModel: () => AIModelInfo | undefined;
  getEffectiveModelId: () => string | undefined;
  refetch: () => Promise<unknown>;
}

/**
 * Pure query fetcher for AI models.
 */
export async function fetchAiModels(
  forceRefresh: boolean = false,
): Promise<AIModelsApiResponse> {
  const url = forceRefresh ? "/ai/models?refresh=true" : "/ai/models";
  const { data } = await API.get<AIModelsApiResponse>(url);
  return data;
}

/**
 * Pure resolver for matching active or fallback available model.
 */
export function resolveSelectedModel(
  models: AIModelInfo[],
  selectedModelId: string,
): AIModelInfo | undefined {
  const current = models.find(
    (m) => m.id === selectedModelId && m.isAvailable,
  );
  if (current) return current;
  return models.find((m) => m.isAvailable);
}

/**
 * Pure resolver for effective model ID (falling back to first available if current selection is unavailable).
 */
export function resolveEffectiveModelId(
  models: AIModelInfo[],
  selectedModelId: string,
): string | undefined {
  const available = resolveSelectedModel(models, selectedModelId);
  return available?.id || selectedModelId || undefined;
}

/**
 * Pure cache updater for force-refreshing AI models.
 */
export async function refreshAiModels(
  queryClient: Pick<QueryClient, "setQueryData">,
): Promise<AIModelsApiResponse> {
  const freshData = await fetchAiModels(true);
  queryClient.setQueryData(aiKeys.models(), freshData);
  return freshData;
}

/**
 * Idiomatic TanStack Query v5 hook for AI models.
 * Replaces manual Zustand server-state storage with declarative useQuery caching.
 */
export function useAiModels(): UseAiModelsResult {
  const queryClient = useQueryClient();
  const selectedModelId = useAiPreferenceStore((s) => s.selectedModelId);
  const setSelectedModelId = useAiPreferenceStore((s) => s.setSelectedModelId);
  const [isRefreshingManual, setIsRefreshingManual] = useState(false);

  const query = useQuery({
    queryKey: aiKeys.models(),
    queryFn: () => fetchAiModels(false),
    staleTime: 5 * 60 * 1000,
  });

  const models = useMemo(
    () => query.data?.models ?? EMPTY_MODELS,
    [query.data?.models],
  );
  const cachedAt = query.data?.cachedAt ?? null;
  const isLoading = query.isLoading;
  const isRefreshing =
    isRefreshingManual || (query.isFetching && !query.isLoading);
  const error = query.error
    ? getApiErrorMessage(query.error, "Failed to fetch AI models")
    : null;

  const fetchAiModelsFn = useCallback(
    async (forceRefresh: boolean = false): Promise<void> => {
      if (forceRefresh) {
        setIsRefreshingManual(true);
        try {
          await refreshAiModels(queryClient);
          toast.success("AI models quota status updated!");
        } catch (err) {
          const msg = getApiErrorMessage(err, "Failed to fetch AI models");
          toast.error(msg);
        } finally {
          setIsRefreshingManual(false);
        }
      } else {
        await query.refetch();
      }
    },
    [query, queryClient],
  );

  const getSelectedModel = useCallback((): AIModelInfo | undefined => {
    return resolveSelectedModel(models, selectedModelId);
  }, [models, selectedModelId]);

  const getEffectiveModelId = useCallback((): string | undefined => {
    return resolveEffectiveModelId(models, selectedModelId);
  }, [models, selectedModelId]);

  return {
    models,
    selectedModelId,
    isLoading,
    isRefreshing,
    error,
    cachedAt,
    fetchAiModels: fetchAiModelsFn,
    setSelectedModelId,
    getSelectedModel,
    getEffectiveModelId,
    refetch: query.refetch,
  };
}
