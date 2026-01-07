import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/contexts/auth-context";
import {
  getAvailableProviders,
  updateUserProvider,
  getUserProvider,
} from "@/lib/ai-provider";
import {
  AI_PROVIDER,
  ProviderInfo,
  UserProviderResponse,
  ProviderAvailabilityResponse,
} from "@/types/ai-provider.types";
import { logger } from "@/lib/logger";

export default function AIProviderSelectionPage() {
  const colors = useThemeColors();
  const { isDark } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  // Local component state
  const [currentProvider, setCurrentProvider] = useState<AI_PROVIDER>(
    AI_PROVIDER.ANTHROPIC as AI_PROVIDER
  );
  const [currentModel, setCurrentModel] = useState<string>(
    "claude-sonnet-4-20250514"
  );
  // Start with empty - no assumptions about what should be available
  const [availableProviders, setAvailableProviders] = useState<{
    [key in AI_PROVIDER]: ProviderInfo;
  }>({} as { [key in AI_PROVIDER]: ProviderInfo });
  const [isLoading, setIsLoading] = useState(true);
  const [switching, setSwitching] = useState<{
    provider: AI_PROVIDER;
    model: string;
  } | null>(null);
  const [expandedProviders, setExpandedProviders] = useState<
    Record<AI_PROVIDER, boolean>
  >({
    [AI_PROVIDER.ANTHROPIC]: false,
    [AI_PROVIDER.OPENAI]: false,
    [AI_PROVIDER.GOOGLE]: false,
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSwitch, setPendingSwitch] = useState<{
    provider: AI_PROVIDER;
    model: string;
    providerInfo: any;
    modelInfo: any;
  } | null>(null);

  // Load data on mount
  useEffect(() => {
    if (user?.id) {
      loadInitialData();
    }
  }, [user?.id]);

  const loadInitialData = async () => {
    setIsLoading(true);
    await Promise.all([loadUserProvider(), loadAvailableProviders()]);
    setIsLoading(false);
  };

  const loadUserProvider = async () => {
    if (!user?.id) return;

    try {
      const response: UserProviderResponse = await getUserProvider(user.id);
      if (response.success) {
        setCurrentProvider(response.provider);
        setCurrentModel(response.model);
      }
    } catch (error) {
      logger.error("Failed to load user provider", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const loadAvailableProviders = async () => {
    try {
      const response: ProviderAvailabilityResponse =
        await getAvailableProviders();
      if (response.success) {
        setAvailableProviders(response.providers);
      }
    } catch (error) {
      logger.error("Failed to load available providers", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const switchProvider = async (
    provider: AI_PROVIDER,
    model: string
  ): Promise<boolean> => {
    if (!user?.id) return false;

    // Check if provider is available
    if (!availableProviders[provider]?.available) {
      return false;
    }

    try {
      setIsLoading(true);
      const response = await updateUserProvider(user.id, provider, model);

      if (response.success) {
        setCurrentProvider(provider);
        setCurrentModel(model);
        logger.info(`Switched AI provider to ${provider}/${model}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Failed to switch provider to ${provider}/${model}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderSwitch = async (provider: AI_PROVIDER, model: string) => {
    if (provider === currentProvider && model === currentModel) return;

    const providerInfo = availableProviders[provider];
    const modelInfo = providerInfo.models.find((m) => m.id === model);

    setPendingSwitch({
      provider,
      model,
      providerInfo,
      modelInfo,
    });
    setShowConfirmModal(true);
  };

  const confirmProviderSwitch = async () => {
    if (!pendingSwitch) return;

    const { provider, model, providerInfo, modelInfo } = pendingSwitch;

    setShowConfirmModal(false);
    setSwitching({ provider, model });

    const success = await switchProvider(provider, model);
    setSwitching(null);
    setPendingSwitch(null);

    if (success) {
      Alert.alert(
        "Success",
        `Successfully switched to ${providerInfo.displayName} - ${modelInfo?.displayName}`,
        [{ text: "OK" }]
      );
    } else {
      Alert.alert("Error", "Failed to switch AI provider. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  const cancelProviderSwitch = () => {
    setShowConfirmModal(false);
    setPendingSwitch(null);
  };

  const handleExit = () => {
    router.back();
  };

  const getProviderIcon = (
    provider: AI_PROVIDER
  ): keyof typeof Ionicons.glyphMap => {
    switch (provider) {
      case AI_PROVIDER.ANTHROPIC:
        return "infinite";
      case AI_PROVIDER.OPENAI:
        return "flash";
      case AI_PROVIDER.GOOGLE:
        return "search";
      default:
        return "hardware-chip";
    }
  };

  const toggleProvider = (provider: AI_PROVIDER) => {
    setExpandedProviders((prev) => {
      const isCurrentlyExpanded = prev[provider];

      // If clicking on an already expanded provider, collapse it
      if (isCurrentlyExpanded) {
        return {
          ...prev,
          [provider]: false,
        };
      }

      // If clicking on a collapsed provider, expand it and collapse all others
      return {
        [AI_PROVIDER.ANTHROPIC]: false,
        [AI_PROVIDER.OPENAI]: false,
        [AI_PROVIDER.GOOGLE]: false,
        [provider]: true,
      };
    });
  };

  const getProviderColor = (): string => {
    // All providers use brand primary color for consistency
    return colors.brand.primary;
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={colors.brand.primary} />
          <Text className="mt-4 text-text-muted">Loading providers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Handle no providers available
  if (Object.keys(availableProviders).length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 bg-background border-b border-neutral-light-2">
          <TouchableOpacity onPress={handleExit}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <View className="flex-1 justify-center items-center px-4">
          <Ionicons name="cloud-offline" size={64} color={colors.text.muted} />
          <Text className="text-lg font-semibold text-text-primary mt-4 text-center">
            No AI providers available
          </Text>
          <Text className="text-sm text-text-muted mt-2 text-center">
            Contact support if this persists.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-1 bg-background border-b border-neutral-light-2">
        <TouchableOpacity onPress={handleExit}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 p-3"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Welcome Section */}
        <View className="px-5 pt-6 pb-4">
          <View className="flex-row items-center mb-4">
            <Ionicons name="barbell" size={24} color={colors.brand.primary} />
            <Text className="text-xl font-bold text-text-primary ml-3">
              Hello Rich!
            </Text>
          </View>

          <Text className="text-base text-text-primary mb-2 leading-6">
            Choose your AI provider for workout generation.
          </Text>
          <Text className="text-sm text-text-muted leading-5">
            Different providers offer unique approaches to creating your
            personalized workouts. Your selection will be saved for all future
            workouts.
          </Text>
        </View>

        {/* Current Provider Info */}
        <View className="mx-5 mb-4">
          <View className="bg-surface rounded-xl p-3 border border-primary">
            <View className="flex-row items-center">
              <View className="w-6 h-6 rounded-full items-center justify-center mr-3 bg-primary">
                <Ionicons name="checkmark" size={12} color={colors.neutral.white} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold mb-1 text-text-primary">
                  {availableProviders[currentProvider]?.displayName ||
                    currentProvider}
                </Text>
                <Text className="text-xs text-text-muted">
                  {availableProviders[currentProvider]?.models.find(
                    (m) => m.id === currentModel
                  )?.displayName || currentModel}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Provider Options */}
        <View className="mx-5 pt-4">
          <View className="flex-row items-center mb-6">
            <Ionicons
              name="hardware-chip"
              size={20}
              color={colors.brand.primary}
            />
            <Text className="text-lg font-bold text-text-primary ml-2">
              Available Providers
            </Text>
          </View>

          {Object.entries(availableProviders).map(([provider, info]) => {
            const providerKey = provider as AI_PROVIDER;
            // Backend already filtered to only available providers
            // But double-check the available flag just in case
            if (!info.available) return null;

            const isExpanded = expandedProviders[providerKey];

            return (
              <View
                key={provider}
                className="mb-6 rounded-xl border-2 border-neutral-light-2 overflow-hidden"
              >
                {/* Provider Subheading - Accordion Trigger */}
                <TouchableOpacity
                  className="bg-surface p-4 border-b border-neutral-light-2"
                  onPress={() => toggleProvider(providerKey)}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <Ionicons
                        name={getProviderIcon(providerKey)}
                        size={18}
                        color={getProviderColor()}
                      />
                      <Text className="text-base font-semibold text-text-primary ml-3">
                        {info.displayName}
                      </Text>
                      <Text className="text-sm text-text-muted ml-2">
                        • {info.models.length} models
                      </Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={colors.text.muted}
                    />
                  </View>
                </TouchableOpacity>

                {/* Models */}
                {isExpanded && (
                  <View className="bg-neutral-light-1 p-2">
                    {info.models.map((model) => {
                      const isSelected =
                        providerKey === currentProvider &&
                        model.id === currentModel;
                      const isSwitching =
                        switching?.provider === providerKey &&
                        switching?.model === model.id;

                      return (
                        <TouchableOpacity
                          key={model.id}
                          className={`bg-surface rounded-lg p-4 mb-2 ${
                            isSelected
                              ? "border-2 border-primary"
                              : "border border-neutral-light-2"
                          }`}
                          onPress={() =>
                            handleProviderSwitch(providerKey, model.id)
                          }
                          disabled={switching !== null}
                        >
                          <View className="flex-row items-center justify-between">
                            <View className="flex-1">
                              <View className="flex-row items-center mb-1">
                                <Text className="text-sm font-semibold text-text-primary flex-1">
                                  {model.displayName}
                                </Text>
                                {isSelected && (
                                  <View className="w-4 h-4 rounded-full items-center justify-center bg-primary">
                                    <Ionicons
                                      name="checkmark"
                                      size={10}
                                      color={colors.neutral.white}
                                    />
                                  </View>
                                )}
                              </View>

                              <Text className="text-xs text-text-muted leading-4 mb-2">
                                {model.description}
                              </Text>

                              <View className="flex-row items-center justify-between">
                                <View className="px-2 py-1 rounded-full bg-neutral-light-2">
                                  <Text className="text-xs font-medium capitalize text-text-muted">
                                    {model.costTier} cost
                                  </Text>
                                </View>

                                {isSwitching && (
                                  <ActivityIndicator
                                    size="small"
                                    color={colors.brand.primary}
                                  />
                                )}
                              </View>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={cancelProviderSwitch}>
          <View className={`flex-1 bg-black/50 justify-center items-center px-6 ${isDark ? "dark" : ""}`}>
            <TouchableWithoutFeedback>
              <View className="bg-surface rounded-2xl p-6 w-full max-w-sm shadow-xl">
                {/* Icon */}
                <View className="w-16 h-16 rounded-full items-center justify-center mb-4 mx-auto bg-primary/10">
                  <Ionicons
                    name="swap-horizontal"
                    size={32}
                    color={colors.brand.primary}
                  />
                </View>

                {/* Title */}
                <Text className="text-xl font-bold text-text-primary mb-2 text-center">
                  Switch AI Provider
                </Text>

                {/* Description */}
                <Text className="text-base text-text-secondary text-center mb-6 leading-6">
                  Switch to{" "}
                  <Text className="font-semibold">
                    {pendingSwitch?.providerInfo?.displayName} -{" "}
                    {pendingSwitch?.modelInfo?.displayName}
                  </Text>
                  ?{"\n\n"}
                  This will affect workout generation quality and style.
                </Text>

                {/* Buttons */}
                <View className="flex-row space-x-3">
                  <TouchableOpacity
                    className="flex-1 bg-neutral-light-2 rounded-xl py-3 items-center justify-center"
                    onPress={cancelProviderSwitch}
                  >
                    <Text className="text-text-muted font-semibold text-base">
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="flex-1 rounded-xl py-3 items-center justify-center bg-primary"
                    onPress={confirmProviderSwitch}
                  >
                    <Text className="text-neutral-white font-semibold text-base">
                      Switch
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}
