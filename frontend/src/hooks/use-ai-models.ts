import { API, getApiErrorMessage } from "@/lib/axios-client";
import type { AIModelInfo, AIModelsApiResponse } from "@/types/ai.type";
import { toast } from "sonner";
import { create } from "zustand";

const LOCAL_STORAGE_KEY = "chat_selected_ai_model";

interface AIModelsState {
  models: AIModelInfo[];
  selectedModelId: string;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  cachedAt: string | null;

  fetchAiModels: (forceRefresh?: boolean) => Promise<void>;
  setSelectedModelId: (modelId: string) => void;
  getSelectedModel: () => AIModelInfo | undefined;
}

const getInitialSelectedModel = (): string => {
  try {
    return localStorage.getItem(LOCAL_STORAGE_KEY) || "gemini-2.5-flash";
  } catch {
    return "gemini-2.5-flash";
  }
};

export const useAiModels = create<AIModelsState>()((set, get) => ({
  models: [],
  selectedModelId: getInitialSelectedModel(),
  isLoading: false,
  isRefreshing: false,
  error: null,
  cachedAt: null,

  fetchAiModels: async (forceRefresh: boolean = false) => {
    const state = get();

    // Guard: skip if already fetching or if data exists and not forcing refresh
    if (state.isLoading || state.isRefreshing) return;
    if (!forceRefresh && state.models.length > 0) return;

    if (forceRefresh) {
      set({ isRefreshing: true });
    } else {
      set({ isLoading: true });
    }

    try {
      const url = forceRefresh ? "/ai/models?refresh=true" : "/ai/models";
      const { data } = await API.get<AIModelsApiResponse>(url);
      const fetchedModels = data.models || [];

      set((state) => {
        let currentSelected = state.selectedModelId;

        // Auto-select fallback if current selection is invalid or exhausted
        const currentModel = fetchedModels.find((m) => m.id === currentSelected);
        if (!currentModel || !currentModel.isAvailable) {
          const firstAvailable = fetchedModels.find((m) => m.isAvailable);
          if (firstAvailable) {
            currentSelected = firstAvailable.id;
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY, currentSelected);
            } catch (err) {
              console.error("Failed to save selected AI model:", err);
            }
          }
        }

        return {
          models: fetchedModels,
          selectedModelId: currentSelected,
          cachedAt: data.cachedAt || new Date().toISOString(),
          error: null,
        };
      });

      if (forceRefresh) {
        toast.success("AI models quota status updated!");
      }
    } catch (error) {
      const msg = getApiErrorMessage(error, "Failed to fetch AI models");
      set({ error: msg });
      if (forceRefresh) {
        toast.error(msg);
      }
    } finally {
      set({ isLoading: false, isRefreshing: false });
    }
  },

  setSelectedModelId: (modelId: string) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, modelId);
    } catch (err) {
      console.error("Failed to save selected AI model:", err);
    }
    set({ selectedModelId: modelId });
  },

  getSelectedModel: () => {
    const { models, selectedModelId } = get();
    return models.find((m) => m.id === selectedModelId);
  },
}));
