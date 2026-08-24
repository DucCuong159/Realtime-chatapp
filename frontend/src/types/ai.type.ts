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

export interface AIModelsApiResponse {
  message: string;
  models: AIModelInfo[];
  cachedAt?: string;
}
