import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { PurchasesPackage } from "react-native-purchases";
import { useThemeColors } from "@/lib/theme";
import { useSubscriptionPlans } from "@/hooks/use-subscription-plans";
import { PaywallLimits } from "@/types/api";
import SubscriptionPlansList from "./subscription-plans-list";

interface ResultState {
  type: "success" | "info" | "error";
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface PaymentWallModalProps {
  visible: boolean;
  onClose: () => void;
  paywallData: {
    type: string;
    message: string;
    limits?: PaywallLimits;
  };
  onPurchaseSuccess?: () => void;
}

export default function PaymentWallModal({
  visible,
  onClose,
  paywallData,
  onPurchaseSuccess,
}: PaymentWallModalProps) {
  const colors = useThemeColors();
  const {
    packages,
    metadata,
    isLoading,
    error,
    isPurchasing,
    purchasePackage,
    restorePurchases,
    refetch,
  } = useSubscriptionPlans();
  const [selectedPackage, setSelectedPackage] =
    useState<PurchasesPackage | null>(null);
  const [resultState, setResultState] = useState<ResultState | null>(null);
  const pendingSuccessRef = useRef(false);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setResultState(null);
      pendingSuccessRef.current = false;
    }
  }, [visible]);

  const handlePackageSelect = (pkg: PurchasesPackage) => {
    setSelectedPackage(pkg);
  };

  const handleResultDismiss = () => {
    if (resultState?.type === "success") {
      setResultState(null);
      if (Platform.OS === "android") {
        // On Android, onDismiss doesn't fire on Modal, so call
        // onPurchaseSuccess after onClose with a microtask delay
        onClose();
        setTimeout(() => {
          onPurchaseSuccess?.();
        }, 0);
      } else {
        // On iOS, use the onDismiss callback for proper sequencing
        pendingSuccessRef.current = true;
        onClose();
      }
    } else {
      // For info/error, just clear the overlay
      setResultState(null);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) {
      setResultState({
        type: "info",
        title: "Select a Plan",
        description: "Please select a subscription plan first.",
        icon: "information-circle",
      });
      return;
    }

    const success = await purchasePackage(selectedPackage);

    if (success) {
      setResultState({
        type: "success",
        title: "Success!",
        description:
          "Your subscription is now active. Enjoy unlimited access!",
        icon: "checkmark-circle",
      });
    }
  };

  const handleRestore = async () => {
    const success = await restorePurchases();

    if (success) {
      setResultState({
        type: "success",
        title: "Purchases Restored",
        description: "Your previous purchases have been restored.",
        icon: "checkmark-circle",
      });
    } else {
      setResultState({
        type: "error",
        title: "No Purchases Found",
        description:
          "We couldn't find any previous purchases to restore.",
        icon: "alert-circle",
      });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      onDismiss={() => {
        if (pendingSuccessRef.current) {
          pendingSuccessRef.current = false;
          onPurchaseSuccess?.();
        }
      }}
    >
      <SafeAreaView edges={["top"]} className="flex-1 bg-background">
        {/* Header with Close Button */}
        <View className="flex-row items-center justify-between px-5 py-4 border-b border-neutral-light-2">
          <TouchableOpacity
            onPress={onClose}
            className="w-9 h-9 items-center justify-center"
            disabled={isPurchasing}
          >
            <Ionicons name="close" size={28} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 40,
          }}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
          {/* Icon */}
          <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center self-center mb-4">
            <Ionicons
              name="lock-closed"
              size={32}
              color={colors.brand.primary}
            />
          </View>

          {/* Title */}
          <Text className="text-2xl font-bold text-text-primary text-center mb-3">
            Get MastersFit Pro
          </Text>

          {/* Message */}
          <Text className="text-base text-text-secondary text-center leading-6 mb-4">
            {paywallData.message}
          </Text>

          {/* Subscription Plans */}
          <View className="mb-4">
            {isLoading ? (
              <View className="py-8 items-center">
                <ActivityIndicator size="large" color={colors.brand.primary} />
                <Text className="mt-4 text-sm text-text-secondary">
                  Loading plans...
                </Text>
              </View>
            ) : error ? (
              <View className="py-8 items-center">
                <Ionicons
                  name="alert-circle"
                  size={48}
                  color={colors.brand.secondary}
                  style={{ marginBottom: 12 }}
                />
                <Text className="text-sm text-text-secondary text-center mb-4">
                  {error}
                </Text>
                <TouchableOpacity
                  onPress={() => refetch()}
                  className="bg-primary rounded-xl py-3 px-6"
                >
                  <Text className="text-white font-semibold text-sm">
                    Retry
                  </Text>
                </TouchableOpacity>
              </View>
            ) : packages.length === 0 ? (
              <View className="py-8">
                <Text className="text-sm text-text-secondary text-center">
                  No subscription plans available at this time.
                </Text>
              </View>
            ) : (
              <SubscriptionPlansList
                packages={packages}
                selectedPackageId={selectedPackage?.identifier}
                onPackageSelect={handlePackageSelect}
                metadata={metadata}
              />
            )}
          </View>

          {/* Subscribe Button */}
          {packages.length > 0 && (
            <TouchableOpacity
              className={`bg-primary rounded-2xl py-[18px] items-center justify-center mb-3 ${
                !selectedPackage || isPurchasing ? "opacity-60" : ""
              }`}
              onPress={handlePurchase}
              disabled={!selectedPackage || isPurchasing}
              activeOpacity={0.8}
            >
              {isPurchasing ? (
                <ActivityIndicator
                  size="small"
                  color={colors.contentOnPrimary}
                />
              ) : (
                <Text className="text-content-on-primary text-lg font-bold">
                  {selectedPackage
                    ? `Subscribe for ${selectedPackage.product.priceString}`
                    : "Select a Plan"}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {/* Restore Purchases */}
          <TouchableOpacity
            className="py-3 items-center mb-4"
            onPress={handleRestore}
            disabled={isPurchasing}
          >
            <Text className="text-primary text-sm font-semibold">
              Restore Purchases
            </Text>
          </TouchableOpacity>

          {/* Footer */}
          <View className="border-t border-neutral-light-2 pt-4">
            <Text className="text-xs text-text-muted text-center leading-[18px]">
              You can continue using your existing workout plans without a
              subscription. Subscription automatically renews unless canceled at
              least 24 hours before the end of the current period.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Inline Result Overlay (replaces nested CustomDialog Modal) */}
      {resultState && (
        <TouchableWithoutFeedback onPress={handleResultDismiss}>
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: 24,
              zIndex: 100,
            }}
          >
            <TouchableWithoutFeedback>
              <View className="bg-surface rounded-2xl p-6 w-full max-w-sm shadow-xl items-center">
                <View className="size-16 rounded-full bg-primary/10 items-center justify-center mb-4">
                  <Ionicons
                    name={resultState.icon}
                    size={32}
                    color={colors.brand.primary}
                  />
                </View>
                <Text className="text-xl font-bold text-text-primary mb-2 text-center">
                  {resultState.title}
                </Text>
                <Text className="text-base text-text-secondary text-center mb-6 leading-6">
                  {resultState.description}
                </Text>
                <TouchableOpacity
                  className="bg-primary rounded-xl py-3 px-8 w-full items-center justify-center"
                  onPress={handleResultDismiss}
                >
                  <Text className="text-content-on-primary font-semibold text-base">
                    OK
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      )}
    </Modal>
  );
}
