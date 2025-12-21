import React, { useState } from "react";
import {
  Modal,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";
import { useSubscriptionPlans } from "@/hooks/use-subscription-plans";
import { SubscriptionPlan, PaywallLimits } from "@/types/api";
import SubscriptionPlansList from "./subscription-plans-list";

interface PaymentWallModalProps {
  visible: boolean;
  onClose: () => void;
  paywallData: {
    type: string;
    message: string;
    limits?: PaywallLimits;
  };
  onPlanSelect?: (plan: SubscriptionPlan) => void;
}

export default function PaymentWallModal({
  visible,
  onClose,
  paywallData,
  onPlanSelect,
}: PaymentWallModalProps) {
  const { plans, isLoading, error, refetch } = useSubscriptionPlans();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(
    null
  );

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    onPlanSelect?.(plan);
    // In the future, this will trigger RevenueCat purchase flow
    // For now, just log it
    console.log("Plan selected:", plan.planId);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        {/* Header with Close Button */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Subscription</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons
              name="lock-closed"
              size={32}
              color={colors.brand.primary}
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>Subscription Required</Text>

          {/* Message */}
          <Text style={styles.message}>{paywallData.message}</Text>

          {/* Subscription Plans */}
          <View style={styles.plansContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.brand.primary} />
                <Text style={styles.loadingText}>Loading plans...</Text>
              </View>
            ) : error ? (
              <View style={styles.errorContainer}>
                <Ionicons
                  name="alert-circle"
                  size={48}
                  color={colors.brand.secondary}
                  style={{ marginBottom: 12 }}
                />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  onPress={() => refetch()}
                  style={styles.retryButton}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : plans.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No subscription plans available at this time.
                </Text>
              </View>
            ) : (
              <SubscriptionPlansList
                plans={plans}
                selectedPlanId={selectedPlan?.planId}
                onPlanSelect={handlePlanSelect}
              />
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              You can continue using your existing workout plans without a
              subscription.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerSpacer: {
    width: 36, // Same width as close button for centering
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text.primary,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${colors.brand.primary}15`,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 16,
  },
  limitsContainer: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  limitsText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: "center",
  },
  plansContainer: {
    marginBottom: 16,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.text.secondary,
  },
  errorContainer: {
    paddingVertical: 32,
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: colors.brand.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  emptyContainer: {
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: "center",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: colors.text.muted,
    textAlign: "center",
  },
});
