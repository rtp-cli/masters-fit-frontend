export enum AI_PROVIDER {
  ANTHROPIC = "anthropic",
  OPENAI = "openai",
  GOOGLE = "google",
}

export interface ModelConfig {
  id: string;
  name: string;
  displayName: string;
  maxTokens: number;
  costTier: "low" | "medium" | "high";
  description: string;
}

export interface ProviderInfo {
  available: boolean;
  displayName: string;
  models: ModelConfig[];
  defaultModel: string;
}

export interface ProviderAvailabilityResponse {
  success: boolean;
  providers: Record<AI_PROVIDER, ProviderInfo>;
}

export interface UpdateProviderRequest {
  provider: AI_PROVIDER;
  model: string;
}

export interface UserProviderResponse {
  success: boolean;
  provider: AI_PROVIDER;
  model: string;
}
