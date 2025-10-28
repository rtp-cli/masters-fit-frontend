import { apiRequest } from "./api";
import {
  ProviderAvailabilityResponse,
  UpdateProviderRequest,
  UserProviderResponse,
  AIProvider,
} from "@/types/ai-provider.types";

export const getAvailableProviders =
  async (): Promise<ProviderAvailabilityResponse> => {
    return apiRequest<ProviderAvailabilityResponse>("/ai-providers/available");
  };

export const updateUserProvider = async (
  userId: number,
  provider: AIProvider,
  model: string
): Promise<{ success: boolean }> => {
  return apiRequest<{ success: boolean }>(
    `/ai-providers/user/${userId}/provider`,
    {
      method: "PUT",
      body: JSON.stringify({ provider, model }),
    }
  );
};

export const getUserProvider = async (
  userId: number
): Promise<UserProviderResponse> => {
  return apiRequest<UserProviderResponse>(
    `/ai-providers/user/${userId}/provider`
  );
};
