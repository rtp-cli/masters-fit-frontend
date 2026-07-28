import { useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";

import IconButton from "@/components/icon-button";
import { useAuth } from "@/contexts/auth-context";
import { updateUserName } from "@/lib/profile";
import { type User } from "@/lib/types";

import {
  type ThemeColorPalette,
  useThemeColors,
} from "../../../lib/theme";

interface ProfileSectionProps {
  user: User | null;
}

export default function ProfileSection({ user }: ProfileSectionProps) {
  const colors = useThemeColors();
  const { setUserData } = useAuth();
  // Completion accent; falls back to ink for themes without it (same
  // pattern as adaptive-set-tracker.tsx).
  const successColor =
    (colors as ThemeColorPalette).success ?? colors.brand.primary;

  // Inline name editor ("fix a typo" affordance). Email is deliberately not
  // editable — it's the account identity.
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  // Get user initials
  const getUserInitials = () => {
    if (user?.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return "U";
  };

  const startEditingName = () => {
    setDraftName(user?.name ?? "");
    setNameError(null);
    setIsEditingName(true);
  };

  const cancelEditingName = () => {
    setIsEditingName(false);
    setNameError(null);
  };

  const saveName = async () => {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setNameError("Name cannot be empty");
      return;
    }
    if (!user || trimmed === user.name) {
      setIsEditingName(false);
      return;
    }

    setIsSavingName(true);
    setNameError(null);
    try {
      const savedName = await updateUserName(trimmed);
      // Auth context is the single source for the name (Dashboard greeting,
      // this sheet, initials) — updating it propagates everywhere at once.
      await setUserData({ ...user, name: savedName });
      setIsEditingName(false);
    } catch (error) {
      setNameError(
        error instanceof Error ? error.message : "Failed to update name",
      );
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <View className="items-center px-6 mb-6">
      <View className="size-20 rounded-full bg-primary items-center justify-center mb-4">
        <Text
          className="text-3xl font-bold"
          style={{ color: colors.contentOnPrimary }}
        >
          {getUserInitials()}
        </Text>
      </View>

      {isEditingName ? (
        <>
          <View className="flex-row items-center">
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              autoFocus
              autoCapitalize="words"
              maxLength={80}
              editable={!isSavingName}
              onSubmitEditing={saveName}
              returnKeyType="done"
              accessibilityLabel="Your name"
              className="text-xl font-bold text-text-primary border-b border-neutral-medium-1 px-2 py-1 min-w-[160px] text-center"
            />
            {isSavingName ? (
              <View className="size-[44px] items-center justify-center ml-1">
                <ActivityIndicator size="small" color={colors.text.primary} />
              </View>
            ) : (
              <>
                <IconButton
                  icon="checkmark"
                  accessibilityLabel="Save name"
                  variant="ghost"
                  size={22}
                  color={successColor}
                  onPress={saveName}
                  className="ml-1"
                />
                <IconButton
                  icon="close"
                  accessibilityLabel="Cancel editing name"
                  variant="ghost"
                  size={20}
                  color={colors.text.muted}
                  onPress={cancelEditingName}
                />
              </>
            )}
          </View>
          {nameError ? (
            <Text className="text-sm text-danger mt-1">{nameError}</Text>
          ) : null}
        </>
      ) : (
        <View className="flex-row items-center">
          {/* Spacer mirroring the pencil keeps the name optically centered */}
          <View className="w-[44px]" />
          <Text className="text-xl font-bold text-text-primary">
            {user?.name || "User"}
          </Text>
          <IconButton
            icon="pencil-outline"
            accessibilityLabel="Edit name"
            variant="ghost"
            size={16}
            color={colors.text.muted}
            onPress={startEditingName}
          />
        </View>
      )}

      <Text className="text-sm text-text-muted mt-1">
        {user?.email || "No email provided"}
      </Text>
    </View>
  );
}
