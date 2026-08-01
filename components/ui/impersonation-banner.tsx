import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/contexts/auth-context";
import { useThemeColors } from "@/lib/theme";

/**
 * App-wide banner shown whenever an admin is impersonating ("viewing as") another
 * user. Deliberately loud and impossible to miss: a full-width red bar pinned to
 * the very top of the app, above every route including tabs and modals. It states
 * WHO is being viewed and that the session is read-only, and offers a one-tap
 * exit back to the admin's own account.
 *
 * Mounted once at the root (app/_layout.tsx) as the first child of the app column
 * so it pushes all content down — the entire app visibly sits "under" it while
 * impersonating. Renders nothing when not impersonating.
 */
export default function ImpersonationBanner() {
  const { isImpersonating, user, exitImpersonation } = useAuth();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [exiting, setExiting] = useState(false);

  if (!isImpersonating) return null;

  const handleExit = async () => {
    if (exiting) return;
    setExiting(true);
    try {
      await exitImpersonation();
    } finally {
      setExiting(false);
    }
  };

  const DANGER = colors.danger;

  return (
    <View
      style={{ backgroundColor: DANGER, paddingTop: insets.top }}
      accessibilityLiveRegion="assertive"
    >
      <View className="flex-row items-center px-4 py-2">
        <Ionicons name="eye" size={18} color="#FFFFFF" />
        <View className="flex-1 ml-2">
          <Text className="text-white text-sm font-bold" numberOfLines={1}>
            VIEWING AS {user?.email ?? "another user"}
          </Text>
          <Text className="text-white/90 text-xs" numberOfLines={1}>
            Read-only · tap EXIT to return
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleExit}
          disabled={exiting}
          accessibilityRole="button"
          accessibilityLabel="Exit impersonation"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="ml-3 rounded-full bg-white px-3 py-1.5 flex-row items-center"
        >
          {exiting ? (
            <ActivityIndicator size="small" color={DANGER} />
          ) : (
            <Text className="text-sm font-bold" style={{ color: DANGER }}>
              EXIT
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
