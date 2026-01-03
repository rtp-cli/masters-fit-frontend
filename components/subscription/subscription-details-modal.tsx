import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";
import { useSubscriptionStatus } from "@/hooks/use-subscription-status";

interface SubscriptionDetailsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SubscriptionDetailsModal({
  visible,
  onClose,
}: SubscriptionDetailsModalProps) {
  const { activeEntitlement, productIdentifier, expirationDate, willRenew } =
    useSubscriptionStatus();

  if (!activeEntitlement) {
    return null;
  }

  const formatDate = (date: Date | null): string => {
    if (!date) return "N/A";
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Extract product name from identifier (e.g., "masters_fit_monthly" -> "Monthly Premium")
  const getProductName = (identifier: string | null): string => {
    if (!identifier) return "Premium Subscription";

    // Try to extract readable name from identifier
    if (identifier.includes("annual") || identifier.includes("yearly")) {
      return "Annual Premium";
    }
    if (identifier.includes("monthly")) {
      return "Monthly Premium";
    }
    if (identifier.includes("weekly")) {
      return "Weekly Premium";
    }

    // Fallback: capitalize and format
    return identifier
      .replace(/_/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Subscription Details</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Pro Badge */}
          <View style={styles.badgeContainer}>
            <View style={styles.proBadge}>
              <Ionicons name="star" size={24} color="#FFD700" />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          </View>

          {/* Subscription Info */}
          <View style={styles.section}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Plan</Text>
              <Text style={styles.value}>
                {getProductName(productIdentifier)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusContainer}>
                <View style={styles.activeDot} />
                <Text style={styles.statusText}>Active</Text>
              </View>
            </View>

            {expirationDate && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>
                  {willRenew ? "Renews on" : "Expires on"}
                </Text>
                <Text style={styles.value}>{formatDate(expirationDate)}</Text>
              </View>
            )}

            {activeEntitlement.periodType && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Billing Period</Text>
                <Text style={styles.value}>
                  {activeEntitlement.periodType === "NORMAL"
                    ? "Subscription"
                    : activeEntitlement.periodType.charAt(0).toUpperCase() +
                      activeEntitlement.periodType.slice(1).toLowerCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Features */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Premium Benefits</Text>
            <View style={styles.featuresList}>
              <View style={styles.featureRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.brand.primary}
                />
                <Text style={styles.featureText}>
                  Unlimited workout regenerations
                </Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.brand.primary}
                />
                <Text style={styles.featureText}>Priority AI processing</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.brand.primary}
                />
                <Text style={styles.featureText}>Advanced analytics</Text>
              </View>
            </View>
          </View>

          {/* Footer Note */}
          {willRenew && (
            <View style={styles.footerNote}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={colors.text.muted}
              />
              <Text style={styles.footerText}>
                Your subscription will automatically renew. You can manage or
                cancel your subscription in your device settings.
              </Text>
            </View>
          )}
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
    width: 36,
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
  badgeContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.brand.primary}15`,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  proBadgeText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.brand.primary,
    letterSpacing: 1,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  label: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.primary,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#10B981",
  },
  featuresList: {
    gap: 12,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: colors.text.secondary,
    flex: 1,
  },
  footerNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderRadius: 8,
    gap: 8,
    marginTop: 8,
  },
  footerText: {
    fontSize: 12,
    color: colors.text.muted,
    flex: 1,
    lineHeight: 18,
  },
});
