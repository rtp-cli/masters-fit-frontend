import React, { useState } from "react";
import {
  Modal,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PurchasesPackage } from "react-native-purchases";
import { useThemeColors } from "@/lib/theme";
import { useSubscriptionPlans } from "@/hooks/use-subscription-plans";
import { PaywallLimits } from "@/types/api";
import SubscriptionPlansList from "./subscription-plans-list";
import { CustomDialog, DialogButton } from "../ui";

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
    isLoading,
    error,
    isPurchasing,
    purchasePackage,
    restorePurchases,
    refetch,
  } = useSubscriptionPlans();
  const [selectedPackage, setSelectedPackage] =
    useState<PurchasesPackage | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    description: string;
    primaryButton: DialogButton;
    secondaryButton?: DialogButton;
    icon?: keyof typeof Ionicons.glyphMap;
  } | null>(null);

  const handlePackageSelect = (pkg: PurchasesPackage) => {
    setSelectedPackage(pkg);
  };

  const handlePurchase = async () => {
    if (!selectedPackage) {
      setDialogConfig({
        title: "Select a Plan",
        description: "Please select a subscription plan first.",
        primaryButton: {
          text: "OK",
          onPress: () => setDialogVisible(false),
        },
        icon: "information-circle",
      });
      setDialogVisible(true);
      return;
    }

    const success = await purchasePackage(selectedPackage);

    if (success) {
      setDialogConfig({
        title: "Success!",
        description: "Your subscription is now active. Enjoy unlimited access!",
        primaryButton: {
          text: "OK",
          onPress: () => {
            setDialogVisible(false);
            onPurchaseSuccess?.();
            onClose();
          },
        },
        icon: "checkmark-circle",
      });
      setDialogVisible(true);
    }
  };

  const handleRestore = async () => {
    const success = await restorePurchases();

    if (success) {
      setDialogConfig({
        title: "Purchases Restored",
        description: "Your previous purchases have been restored.",
        primaryButton: {
          text: "OK",
          onPress: () => {
            setDialogVisible(false);
            onPurchaseSuccess?.();
            onClose();
          },
        },
        icon: "checkmark-circle",
      });
      setDialogVisible(true);
    } else {
      setDialogConfig({
        title: "No Purchases Found",
        description: "We couldn't find any previous purchases to restore.",
        primaryButton: {
          text: "OK",
          onPress: () => setDialogVisible(false),
        },
        icon: "alert-circle",
      });
      setDialogVisible(true);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView className="flex-1 bg-background">
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
            Unlock Premium
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
                <ActivityIndicator size="small" color={colors.contentOnPrimary} />
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

      {/* Custom Dialog */}
      {dialogConfig && (
        <CustomDialog
          visible={dialogVisible}
          onClose={() => setDialogVisible(false)}
          title={dialogConfig.title}
          description={dialogConfig.description}
          primaryButton={dialogConfig.primaryButton}
          secondaryButton={dialogConfig.secondaryButton}
          icon={dialogConfig.icon}
        />
      )}
    </Modal>
  );
}
