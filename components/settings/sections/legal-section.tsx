import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

import { useThemeColors } from "../../../lib/theme";

interface LegalSectionProps {
  expanded: boolean;
  onToggle: () => void;
}

export default function LegalSection({
  expanded,
  onToggle,
}: LegalSectionProps) {
  const router = useRouter();
  const colors = useThemeColors();

  return (
    <>
      <TouchableOpacity
        className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2"
        onPress={onToggle}
      >
        <View className="flex-row items-center flex-1">
          <Ionicons
            name="document-text-outline"
            size={20}
            color={colors.text.muted}
          />
          <Text className="text-sm text-text-primary ml-3">Legal</Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.neutral.medium[3]}
        />
      </TouchableOpacity>

      {/* Expanded Legal Options */}
      {expanded && (
        <View className="bg-neutral-light-1">
          <TouchableOpacity
            className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2 pl-4"
            onPress={() =>
              router.push({
                pathname: "/legal-document",
                params: { type: "terms" },
              } as any)
            }
          >
            <View className="flex-row items-center flex-1">
              <Ionicons
                name="newspaper-outline"
                size={18}
                color={colors.text.muted}
              />
              <Text className="text-sm text-text-primary ml-3">
                Terms & Conditions
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.neutral.medium[3]}
            />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2 pl-4"
            onPress={() =>
              router.push({
                pathname: "/legal-document",
                params: { type: "privacy" },
              } as any)
            }
          >
            <View className="flex-row items-center flex-1">
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={colors.text.muted}
              />
              <Text className="text-sm text-text-primary ml-3">
                Privacy Policy
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.neutral.medium[3]}
            />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2 pl-4"
            onPress={() =>
              router.push({
                pathname: "/legal-document",
                params: { type: "waiver" },
              } as any)
            }
          >
            <View className="flex-row items-center flex-1">
              <Ionicons
                name="shield-checkmark-outline"
                size={18}
                color={colors.text.muted}
              />
              <Text className="text-sm text-text-primary ml-3">
                Waiver of Liability
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.neutral.medium[3]}
            />
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}
