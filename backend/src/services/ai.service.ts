import { Env } from "../config/env.config.js";
import { HTTPSTATUS } from "../config/http.config.js";
import { InternalServerException } from "../utils/app-error.js";

export type AIModelStatus = "ready" | "quota_exceeded" | "busy" | "error";

export interface AIModelInfo {
  id: string;
  name: string;
  description?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  status: AIModelStatus;
  latencyMs?: number;
  statusBadge: string;
  note: string;
  isAvailable: boolean;
}

interface RawGeminiModel {
  name: string;
  displayName?: string;
  description?: string;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
  supportedGenerationMethods?: string[];
}

interface ListModelsApiResponse {
  models?: RawGeminiModel[];
  error?: {
    code: number;
    message: string;
    status: string;
  };
}

// In-memory cache for models and their quota status
interface ModelsCache {
  data: AIModelInfo[];
  cachedAt: number;
}

let modelsCache: ModelsCache | null = null;
let inFlightFetchPromise: Promise<{
  models: AIModelInfo[];
  cachedAt: string;
}> | null = null;

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes normal cache TTL (drastically saves quota)
const MIN_FORCE_REFRESH_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes cooldown between forced live probes

/**
 * Filter only pure text/chat models.
 * Exclude multi-modal generation (Image, TTS, Music) and specialized preview agents (Robotics, Computer Use, Deep Research).
 */
const isTextOutModel = (modelId: string): boolean => {
  const id = modelId.toLowerCase();

  // 1. Multi-modal generative models (Image, TTS, Music)
  const isImageOrMedia =
    id.includes("image") || id.includes("banana") || id.includes("lyria");
  const isTTS = id.includes("tts");

  // 2. Agents & Specialized previews (Robotics, Computer use, Deep research, Antigravity)
  const isAgentOrSpecialized =
    id.includes("robotics") ||
    id.includes("antigravity") ||
    id.includes("deep-research") ||
    id.includes("computer-use") ||
    id.includes("customtools");

  if (isImageOrMedia || isTTS || isAgentOrSpecialized) {
    return false;
  }

  // Pure text chat models
  return id.startsWith("gemini-") || id.startsWith("gemma-");
};

interface QuotaCheckResult {
  isSupported: boolean;
  status: AIModelStatus;
  latencyMs?: number;
  statusBadge: string;
  note: string;
  isAvailable: boolean;
}

/**
 * Ping test to check if the model has available quota and evaluate its latency.
 */
const checkModelQuota = async (
  modelId: string,
  apiKey: string,
): Promise<QuotaCheckResult> => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
  const startTime = Date.now();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const elapsed = Date.now() - startTime;

    if (res.status === HTTPSTATUS.SUCCESS) {
      return {
        isSupported: true,
        status: "ready",
        latencyMs: elapsed,
        statusBadge: `🟢 ${(elapsed / 1000).toFixed(1)}s`,
        note: "Ready",
        isAvailable: true,
      };
    }

    if (res.status === HTTPSTATUS.TOO_MANY_REQUESTS) {
      return {
        isSupported: true,
        status: "quota_exceeded",
        latencyMs: elapsed,
        statusBadge: "🔴 Quota Exceeded (429)",
        note: "Daily limit reached",
        isAvailable: false,
      };
    }

    if (res.status === HTTPSTATUS.SERVICE_UNAVAILABLE) {
      return {
        isSupported: true,
        status: "busy",
        latencyMs: elapsed,
        statusBadge: "🟡 Server Busy (503)",
        note: "Server busy",
        isAvailable: false,
      };
    }

    // 404 or 400: Not supported for this API key / deprecated
    return {
      isSupported: false,
      status: "error",
      statusBadge: `⚠️ ${res.status}`,
      note: "Unsupported",
      isAvailable: false,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    const isAbort = error?.name === "AbortError";
    return {
      isSupported: !isAbort,
      status: "error",
      statusBadge: isAbort ? "⏳ Timeout" : "❌ Error",
      note: isAbort
        ? "Request timeout"
        : error.message?.slice(0, 20) || "Connection error",
      isAvailable: false,
    };
  }
};

/**
 * Fetch supported text-out models and their quota status.
 * Uses request coalescing and throttling to prevent quota exhaustion from concurrent/repeated requests.
 */
export const getAvailableTextOutModelsService = async (
  forceRefresh: boolean = false,
): Promise<{ models: AIModelInfo[]; cachedAt: string }> => {
  const apiKey = Env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new InternalServerException(
      "GOOGLE_GENERATIVE_AI_API_KEY is not configured",
    );
  }

  const now = Date.now();

  // 1. Return fresh cached data if still within normal TTL (unless force-refreshed)
  if (
    !forceRefresh &&
    modelsCache &&
    now - modelsCache.cachedAt < CACHE_TTL_MS
  ) {
    return {
      models: modelsCache.data,
      cachedAt: new Date(modelsCache.cachedAt).toISOString(),
    };
  }

  // 2. Throttling: If forceRefresh is requested, but cache was updated very recently (< 30s),
  // reuse the cached result to prevent quota exhaustion from rapid clicks or loops.
  if (
    forceRefresh &&
    modelsCache &&
    now - modelsCache.cachedAt < MIN_FORCE_REFRESH_INTERVAL_MS
  ) {
    return {
      models: modelsCache.data,
      cachedAt: new Date(modelsCache.cachedAt).toISOString(),
    };
  }

  // 3. Request Coalescing: If another probe is already in flight, reuse its promise
  if (inFlightFetchPromise) {
    return inFlightFetchPromise;
  }

  // 4. Launch new probe batch and share in-flight promise with concurrent requests
  inFlightFetchPromise = (async () => {
    try {
      const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
      const listController = new AbortController();
      const listTimeoutId = setTimeout(() => listController.abort(), 10000); // 10s deadline

      let listData: ListModelsApiResponse;
      try {
        const listRes = await fetch(listUrl, { signal: listController.signal });
        listData = await listRes.json();
      } finally {
        clearTimeout(listTimeoutId);
      }

      if (listData.error) {
        throw new InternalServerException(
          `Google API Error [${listData.error.code}]: ${listData.error.message}`,
        );
      }

      // Filter text-out models supporting generateContent
      const rawTextModels =
        listData.models?.filter((m) => {
          const modelId = m.name.replace(/^models\//, "");
          const supportsGenerate =
            m.supportedGenerationMethods?.includes("generateContent");
          return Boolean(supportsGenerate && isTextOutModel(modelId));
        }) || [];

      // Check quota for all candidate models concurrently
      const checkedResults = await Promise.allSettled(
        rawTextModels.map(async (m) => {
          const modelId = m.name.replace(/^models\//, "");
          const quota = await checkModelQuota(modelId, apiKey);
          return {
            model: m,
            modelId,
            quota,
          };
        }),
      );

      const supportedModels: AIModelInfo[] = [];

      for (const result of checkedResults) {
        if (result.status === "fulfilled") {
          const { model, modelId, quota } = result.value;
          if (quota.isSupported) {
            supportedModels.push({
              id: modelId,
              name: model.displayName || modelId,
              description: model.description,
              inputTokenLimit: model.inputTokenLimit,
              outputTokenLimit: model.outputTokenLimit,
              status: quota.status,
              latencyMs: quota.latencyMs,
              statusBadge: quota.statusBadge,
              note: quota.note,
              isAvailable: quota.isAvailable,
            });
          }
        }
      }

      // Sort: Ready models first (sorted by latency ascending), then busy, then quota exceeded
      supportedModels.sort((a, b) => {
        if (a.isAvailable && !b.isAvailable) return -1;
        if (!a.isAvailable && b.isAvailable) return 1;
        if (a.latencyMs && b.latencyMs) return a.latencyMs - b.latencyMs;
        return a.id.localeCompare(b.id);
      });

      const completedAt = Date.now();
      modelsCache = {
        data: supportedModels,
        cachedAt: completedAt,
      };

      return {
        models: supportedModels,
        cachedAt: new Date(completedAt).toISOString(),
      };
    } finally {
      inFlightFetchPromise = null;
    }
  })();

  return inFlightFetchPromise;
};
