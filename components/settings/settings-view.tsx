import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "expo-router";
import { useAppDataContext } from "@/contexts/app-data-context";
import { colors } from "../../lib/theme";
import { SettingsSkeleton } from "../skeletons/skeleton-screens";
import ComingSoonModal from "../coming-soon-modal";
import PaymentWallModal from "@/components/subscription/payment-wall-modal";
import SubscriptionDetailsModal from "@/components/subscription/subscription-details-modal";
import { useSecretActivation } from "@/hooks/use-secret-activation";
import { useSubscriptionStatus } from "@/hooks/use-subscription-status";
import * as Haptics from "expo-haptics";
import { CustomDialog, DialogButton } from "../ui";
import ProfileSection from "./profile-section";
import AppSettingsSection from "./app-settings-section";
import DeveloperToolsSection from "./developer-tools-section";
import PersonalInformationSection from "./personal-information-section";
import FitnessGoalsSection from "./fitness-goals-section";
import PreferredWorkoutTypesSection from "./preferred-workout-types-section";
import EquipmentSection from "./equipment-section";
import WeeklyScheduleSection from "./weekly-schedule-section";
import HealthInformationSection from "./health-information-section";
import SubscriptionSection from "./subscription-section";
import LogoutSection from "./logout-section";
import AppVersionSection from "./app-version-section";

interface SettingsViewProps {
  onClose?: () => void;
}

export default function SettingsView({ onClose }: SettingsViewProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const {
    data: { profileData },
    refresh: { refreshProfile },
    loading,
  } = useAppDataContext();

  // Scroll to top ref
  const scrollViewRef = useRef<ScrollView>(null);

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Coming Soon modals state
  const [comingSoonModal, setComingSoonModal] = useState<{
    visible: boolean;
    icon: keyof typeof Ionicons.glyphMap;
  }>({
    visible: false,
    icon: "information-circle-outline",
  });

  // Secret activation state
  const [tapCount, setTapCount] = useState(0);
  const [tapTimeout, setTapTimeout] = useState<NodeJS.Timeout | null>(null);
  const [debugTapCount, setDebugTapCount] = useState(0);
  const [debugTapTimeout, setDebugTapTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const {
    isSecretActivated,
    activateSecret,
    isDebugModeActivated,
    activateDebugMode,
    deactivateDebugMode,
  } = useSecretActivation();

  // Paywall test modal state
  const [showPaywallTest, setShowPaywallTest] = useState(false);
  const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false);

  // Subscription status
  const { isPro, activeEntitlement, productIdentifier, expirationDate } =
    useSubscriptionStatus();

  // Dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    description: string;
    primaryButton: DialogButton;
    secondaryButton?: DialogButton;
    icon?: keyof typeof Ionicons.glyphMap;
  } | null>(null);

  // Use profile data from the centralized store
  const profile = profileData;

  // Load user profile data
  const loadUserData = async () => {
    if (!user?.id) return;

    try {
      await refreshProfile();
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    await refreshProfile();
  };

  // Scroll to top when tab is focused
  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, [])
  );

  // Listen for tab re-click events
  useEffect(() => {
    const handleScrollToTop = () => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    };

    const { tabEvents } = require("../../lib/tab-events");
    tabEvents.on("scrollToTop:settings", handleScrollToTop);

    return () => {
      tabEvents.off("scrollToTop:settings", handleScrollToTop);
    };
  }, []);

  // Cleanup tap timeout
  useEffect(() => {
    return () => {
      if (tapTimeout) {
        clearTimeout(tapTimeout);
      }
    };
  }, [tapTimeout]);

  // Cleanup debug tap timeout
  useEffect(() => {
    return () => {
      if (debugTapTimeout) {
        clearTimeout(debugTapTimeout);
      }
    };
  }, [debugTapTimeout]);

  // Debug mode activation handler (10 taps on "App Settings")
  const handleDebugTap = async () => {
    // Clear existing timeout
    if (debugTapTimeout) {
      clearTimeout(debugTapTimeout);
    }

    const newTapCount = debugTapCount + 1;
    setDebugTapCount(newTapCount);

    // Provide haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (newTapCount >= 10) {
      // Success! Activate debug mode
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await activateDebugMode();
      setDebugTapCount(0);
      setDialogConfig({
        title: "🧪 Debug Mode Activated",
        description:
          "Developer tools are now available. You can access network logger and test features.",
        primaryButton: {
          text: "OK",
          onPress: () => setDialogVisible(false),
        },
        icon: "checkmark-circle",
      });
      setDialogVisible(true);
    } else if (newTapCount >= 7) {
      // Getting close, provide stronger feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Set timeout to reset tap count after 2 seconds
    const timeout = setTimeout(() => {
      setDebugTapCount(0);
    }, 2000);
    setDebugTapTimeout(timeout);
  };

  // Deactivate debug mode handler
  const handleDeactivateDebugMode = async () => {
    setDialogConfig({
      title: "Deactivate Debug Mode",
      description: "Are you sure you want to turn off developer tools?",
      secondaryButton: {
        text: "Cancel",
        onPress: () => setDialogVisible(false),
      },
      primaryButton: {
        text: "Deactivate",
        onPress: async () => {
          setDialogVisible(false);
          await deactivateDebugMode();
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          );
        },
      },
      icon: "warning",
    });
    setDialogVisible(true);
  };

  useEffect(() => {
    // Only fetch if we don't have profile data yet
    if (!profileData) {
      loadUserData();
    }
  }, [user?.id, profileData]);

  // Show coming soon modal
  const showComingSoonModal = (icon: keyof typeof Ionicons.glyphMap) => {
    setComingSoonModal({
      visible: true,
      icon,
    });
  };

  // Hide coming soon modal
  const hideComingSoonModal = () => {
    setComingSoonModal({
      ...comingSoonModal,
      visible: false,
    });
  };

  // Secret trigger handler
  const handleVersionTap = async () => {
    // Clear existing timeout
    if (tapTimeout) {
      clearTimeout(tapTimeout);
    }

    const newTapCount = tapCount + 1;
    setTapCount(newTapCount);

    // Provide haptic feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (newTapCount >= 5) {
      // Success! Activate secret and navigate to page
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await activateSecret();
      setTapCount(0);

      // Close the settings modal if it's open
      if (onClose) {
        onClose();
      }

      // Navigate to AI provider selection page
      router.push("/ai-provider-selection");
    } else {
      // Set timeout to reset tap count after 1 second
      const timeout = setTimeout(() => {
        setTapCount(0);
      }, 500);
      setTapTimeout(timeout);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    setDialogConfig({
      title: "Confirm Logout",
      description: "Are you sure you want to log out?",
      secondaryButton: {
        text: "Cancel",
        onPress: () => setDialogVisible(false),
      },
      primaryButton: {
        text: "Logout",
        onPress: async () => {
          setDialogVisible(false);
          await logout();
          router.replace("/");
        },
      },
      icon: "log-out-outline",
    });
    setDialogVisible(true);
  };

  if (loading.profileLoading && !profile) {
    return <SettingsSkeleton />;
  }

  return (
    <View className="flex-1 pt-6 bg-background">
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={loading.profileLoading}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* Profile Section */}
        <ProfileSection user={user} />

        {/* Quick Actions */}
        <View className="px-6 mb-6">
          <Text className="text-base font-semibold text-text-primary p-4 mb-4">
            Quick Actions
          </Text>
          <View className="flex-row justify-around">
            <TouchableOpacity
              className="items-center"
              onPress={() => {
                if (onClose) onClose();
                router.push("/profile-edit");
              }}
            >
              <View className="w-12 h-12 rounded-full bg-primary items-center justify-center mb-2">
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={colors.neutral.light[1]}
                />
              </View>
              <Text className="text-xs text-text-muted">Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="items-center"
              onPress={() => showComingSoonModal("help-circle-outline")}
            >
              <View className="w-12 h-12 rounded-full bg-primary items-center justify-center mb-2">
                <Ionicons
                  name="help-circle-outline"
                  size={20}
                  color={colors.neutral.light[1]}
                />
              </View>
              <Text className="text-xs text-text-muted">Help</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="items-center"
              onPress={() => showComingSoonModal("share-outline")}
            >
              <View className="w-12 h-12 rounded-full bg-primary items-center justify-center mb-2">
                <Ionicons
                  name="share-outline"
                  size={20}
                  color={colors.neutral.light[1]}
                />
              </View>
              <Text className="text-xs text-text-muted">Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Personal Information */}
        {profile && <PersonalInformationSection profile={profile} />}

        {/* Fitness Goals */}
        {profile?.goals && profile.goals.length > 0 && (
          <FitnessGoalsSection goals={profile.goals} />
        )}

        {/* Preferred Workout Types */}
        {profile?.preferredStyles && profile.preferredStyles.length > 0 && (
          <PreferredWorkoutTypesSection
            preferredStyles={profile.preferredStyles}
          />
        )}

        {/* Equipment Available */}
        {profile?.equipment && profile.equipment.length > 0 && (
          <EquipmentSection
            equipment={profile.equipment}
            otherEquipment={profile.otherEquipment}
          />
        )}

        {/* Weekly Schedule */}
        {profile?.availableDays && profile.availableDays.length > 0 && (
          <WeeklyScheduleSection availableDays={profile.availableDays} />
        )}

        {/* Limitations & Medical Notes */}
        <HealthInformationSection
          limitations={profile?.limitations}
          medicalNotes={profile?.medicalNotes}
        />

        {/* Subscription Section */}
        <SubscriptionSection
          isPro={isPro}
          activeEntitlement={activeEntitlement}
          productIdentifier={productIdentifier}
          expirationDate={expirationDate}
          onPress={() => setShowSubscriptionDetails(true)}
        />

        {/* App Settings */}
        <AppSettingsSection
          debugTapCount={debugTapCount}
          onDebugTap={handleDebugTap}
        />

        {/* Debug Mode Section - Only visible when debug mode is activated */}
        <DeveloperToolsSection
          isDebugModeActivated={isDebugModeActivated}
          isSecretActivated={isSecretActivated}
          onDeactivateDebugMode={handleDeactivateDebugMode}
          onShowPaywallTest={() => setShowPaywallTest(true)}
          onClose={onClose}
        />

        {/* Logout Button */}
        <LogoutSection onLogout={handleLogout} />

        {/* Version Info */}
        <AppVersionSection tapCount={tapCount} onTap={handleVersionTap} />
      </ScrollView>

      {/* Coming Soon Modal */}
      <ComingSoonModal
        visible={comingSoonModal.visible}
        onClose={hideComingSoonModal}
        icon={comingSoonModal.icon}
      />

      {/* RevenueCat Paywall Test Modal */}
      <PaymentWallModal
        visible={showPaywallTest}
        onClose={() => setShowPaywallTest(false)}
        paywallData={{
          type: "subscription_required",
          message:
            "Testing RevenueCat integration. Select a plan to test the purchase flow.",
        }}
        onPurchaseSuccess={() => {
          setDialogConfig({
            title: "Success",
            description: "Purchase completed successfully!",
            primaryButton: {
              text: "OK",
              onPress: () => {
                setDialogVisible(false);
                setShowPaywallTest(false);
              },
            },
            icon: "checkmark-circle",
          });
          setDialogVisible(true);
        }}
      />

      {/* Subscription Details Modal */}
      <SubscriptionDetailsModal
        visible={showSubscriptionDetails}
        onClose={() => setShowSubscriptionDetails(false)}
      />

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
    </View>
  );
}
