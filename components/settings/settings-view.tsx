import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useCallback,useEffect, useRef, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useTheme } from "@/app/_layout";
import PaymentWallModal from "@/components/subscription/payment-wall-modal";
import SubscriptionDetailsModal from "@/components/subscription/subscription-details-modal";
import { useAppDataContext } from "@/contexts/app-data-context";
import { useAuth } from "@/contexts/auth-context";
import { useSecretActivationContext } from "@/contexts/secret-activation-context";
import { useSubscriptionStatus } from "@/hooks/use-subscription-status";

import { useThemeColors } from "../../lib/theme";
import ComingSoonModal from "../coming-soon-modal";
import { SettingsSkeleton } from "../skeletons/skeleton-screens";
import { CustomDialog, type DialogButton } from "../ui";
import AppSettingsSection from "./sections/app-settings-section";
import AppVersionSection from "./sections/app-version-section";
import DeveloperToolsSection from "./sections/developer-tools-section";
import EquipmentSection from "./sections/equipment-section";
import FitnessGoalsSection from "./sections/fitness-goals-section";
import HealthInformationSection from "./sections/health-information-section";
import LogoutSection from "./sections/logout-section";
import PersonalInformationSection from "./sections/personal-information-section";
import PreferredWorkoutTypesSection from "./sections/preferred-workout-types-section";
import ProfileSection from "./sections/profile-section";
import SubscriptionSection from "./sections/subscription-section";
import WeeklyScheduleSection from "./sections/weekly-schedule-section";

interface SettingsViewProps {
  onClose?: () => void;
  // Requests logout from the modal owner, which performs it after the sheet
  // has fully dismissed (see header.tsx). Avoids unmounting the sheet mid-animation.
  onRequestLogout?: () => void;
}

export default function SettingsView({
  onClose,
  onRequestLogout,
}: SettingsViewProps) {
  const colors = useThemeColors();
  const { mode: themeMode, setThemeMode, colorTheme, setColorTheme } = useTheme();
  const { user, logout, deleteAccount } = useAuth();
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
  } = useSecretActivationContext();

  // Paywall test modal state
  const [showPaywallTest, setShowPaywallTest] = useState(false);
  const [showSubscriptionDetails, setShowSubscriptionDetails] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Subscription status
  const { isPro, activeEntitlement, productIdentifier, expirationDate } =
    useSubscriptionStatus();

  // Dialog state
  const [dialogVisible, setDialogVisible] = useState(false);
  // True while waiting for the confirm dialog to finish dismissing before we
  // request the sheet-close + logout (iOS: avoids dismissing two modals at once).
  const [pendingSheetLogout, setPendingSheetLogout] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    description: string;
    primaryButton: DialogButton;
    secondaryButton?: DialogButton;
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
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

  // Cleanup debug tap timeout
  useEffect(() => {
    return () => {
      if (debugTapTimeout) {
        clearTimeout(debugTapTimeout);
      }
    };
  }, [debugTapTimeout]);

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

  // Force-clear all auth data (bypasses confirmation dialog — for stuck sessions)
  const handleForceLogout = async () => {
    await logout();
    onClose?.();
    router.replace("/");
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
        onPress: () => {
          setDialogVisible(false);
          // Sequence the modal transitions: close THIS confirm dialog first,
          // then request the sheet-close + logout from the dialog's onDismiss
          // once it has fully gone. Dismissing both modals in the same tick
          // orphans the iOS pageSheet (it stays stuck on screen). Android has
          // no such issue and no onDismiss, so act immediately there.
          if (Platform.OS === "ios") {
            setPendingSheetLogout(true);
          } else {
            onRequestLogout?.();
          }
        },
      },
      icon: "log-out-outline",
    });
    setDialogVisible(true);
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    setDialogConfig({
      title: "Delete Account",
      description:
        "Are you sure you want to delete your account? This action cannot be undone. All your data, including workouts, progress, and subscription information, will be permanently deleted.",
      secondaryButton: {
        text: "Cancel",
        onPress: () => setDialogVisible(false),
      },
      primaryButton: {
        text: "Delete Account",
        onPress: async () => {
          setDialogVisible(false);
          const result = await deleteAccount();
          if (result.success) {
            // Close settings modal first
            if (onClose) {
              onClose();
            }
            // Wait for modal to close and auth state to clear, then redirect to login
            setTimeout(() => {
              router.replace("/(auth)/login");
            }, 300);
          } else {
            // Show error message
            setDialogConfig({
              title: "Deletion Failed",
              description:
                result.error ||
                "Failed to delete your account. Please try again or contact support.",
              primaryButton: {
                text: "OK",
                onPress: () => setDialogVisible(false),
              },
              icon: "alert-circle",
              iconColor: "#EF4444",
            });
            setDialogVisible(true);
          }
        },
      },
      icon: "trash-outline",
      iconColor: "#EF4444",
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
              <View className="size-12 rounded-full bg-primary items-center justify-center mb-2">
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
              <View className="size-12 rounded-full bg-primary items-center justify-center mb-2">
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
              <View className="size-12 rounded-full bg-primary items-center justify-center mb-2">
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

        {/* [MF-020] Account */}
        <Text className="text-xs font-semibold text-text-muted uppercase tracking-wide px-6 pt-2 pb-1">
          Account
        </Text>
        {profile && <PersonalInformationSection profile={profile} />}
        <LogoutSection
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
        />

        {/* [MF-020] Training Profile */}
        <Text className="text-xs font-semibold text-text-muted uppercase tracking-wide px-6 pt-4 pb-1">
          Training Profile
        </Text>
        {profile?.goals && profile.goals.length > 0 && (
          <FitnessGoalsSection goals={profile.goals} />
        )}
        {profile?.preferredStyles && profile.preferredStyles.length > 0 && (
          <PreferredWorkoutTypesSection
            preferredStyles={profile.preferredStyles}
          />
        )}
        {profile?.equipment && profile.equipment.length > 0 && (
          <EquipmentSection
            equipment={profile.equipment}
            otherEquipment={profile.otherEquipment}
          />
        )}
        {profile?.availableDays && profile.availableDays.length > 0 && (
          <WeeklyScheduleSection availableDays={profile.availableDays} />
        )}
        <HealthInformationSection
          limitations={profile?.limitations}
          medicalNotes={profile?.medicalNotes}
        />

        {/* [MF-020] Subscription */}
        <Text className="text-xs font-semibold text-text-muted uppercase tracking-wide px-6 pt-4 pb-1">
          Subscription
        </Text>
        <SubscriptionSection
          isPro={isPro}
          activeEntitlement={activeEntitlement}
          productIdentifier={productIdentifier}
          expirationDate={expirationDate}
          onPress={() => setShowSubscriptionDetails(true)}
          onUpgradePress={() => setShowUpgradeModal(true)}
        />

        {/* [MF-020] App */}
        <Text className="text-xs font-semibold text-text-muted uppercase tracking-wide px-6 pt-4 pb-1">
          App
        </Text>
        <AppSettingsSection
          debugTapCount={debugTapCount}
          onDebugTap={handleDebugTap}
          themeMode={themeMode}
          setThemeMode={setThemeMode}
          colorTheme={colorTheme}
          setColorTheme={setColorTheme}
          onClose={onClose}
        />
        {/* Developer Tools - only rendered once debug mode is activated */}
        <DeveloperToolsSection
          isDebugModeActivated={isDebugModeActivated}
          isSecretActivated={isSecretActivated}
          onDeactivateDebugMode={handleDeactivateDebugMode}
          onShowPaywallTest={() => setShowPaywallTest(true)}
          onForceLogout={handleForceLogout}
          onClose={onClose}
        />
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
          setShowPaywallTest(false);
          setTimeout(() => {
            setDialogConfig({
              title: "Success",
              description: "Purchase completed successfully!",
              primaryButton: {
                text: "OK",
                onPress: () => setDialogVisible(false),
              },
              icon: "checkmark-circle",
            });
            setDialogVisible(true);
          }, 100);
        }}
      />

      {/* Subscription Details Modal */}
      <SubscriptionDetailsModal
        visible={showSubscriptionDetails}
        onClose={() => setShowSubscriptionDetails(false)}
      />

      {/* Upgrade to Pro Modal */}
      <PaymentWallModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        paywallData={{
          type: "subscription_required",
          message:
            "Upgrade to MastersFit+ to unlock new training plans, workout adjustments, progress analytics, and health sync.",
        }}
        onPurchaseSuccess={() => {
          setShowUpgradeModal(false);
          setTimeout(() => {
            setDialogConfig({
              title: "Welcome to MastersFit+!",
              description:
                "Your subscription is now active. Enjoy full access to MastersFit+!",
              primaryButton: {
                text: "OK",
                onPress: () => setDialogVisible(false),
              },
              icon: "checkmark-circle",
            });
            setDialogVisible(true);
          }, 100);
        }}
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
          iconColor={dialogConfig.iconColor}
          onDismiss={() => {
            // The confirm dialog has fully dismissed — now it's safe to close
            // the settings sheet and log out (one modal transition at a time).
            if (pendingSheetLogout) {
              setPendingSheetLogout(false);
              onRequestLogout?.();
            }
          }}
        />
      )}
    </View>
  );
}
