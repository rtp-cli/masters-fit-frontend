export enum AIProvider {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  GOOGLE = 'google'
}

export interface ModelConfig {
  id: string;
  name: string;
  displayName: string;
  maxTokens: number;
  costTier: 'low' | 'medium' | 'high';
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
  providers: {
    [key in AIProvider]: ProviderInfo;
  };
}

export interface UpdateProviderRequest {
  provider: AIProvider;
  model: string;
}

export interface UserProviderResponse {
  success: boolean;
  provider: AIProvider;
  model: string;
}