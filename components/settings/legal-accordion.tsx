import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/lib/theme";

export default function LegalAccordion() {
  const colors = useThemeColors();
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleDocumentPress = (type: "waiver" | "terms" | "privacy") => {
    router.push({
      pathname: "/legal-document",
      params: { type },
    } as any);
  };

  return (
    <View className="mx-6 mb-6 bg-white rounded-xl overflow-hidden">
      <Text className="text-base font-semibold text-text-primary p-4 pb-2">
        App Settings
      </Text>

      {/* Legal Accordion */}
      <TouchableOpacity
        className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2"
        onPress={() => setIsExpanded(!isExpanded)}
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
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.neutral.medium[3]}
        />
      </TouchableOpacity>

      {/* Expanded Legal Options */}
      {isExpanded && (
        <View className="bg-neutral-light-1">
          <TouchableOpacity
            className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2 pl-12"
            onPress={() => handleDocumentPress("waiver")}
          >
            <Text className="text-sm text-text-primary">
              Waiver of Liability
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.neutral.medium[3]}
            />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2 pl-12"
            onPress={() => handleDocumentPress("terms")}
          >
            <Text className="text-sm text-text-primary">
              Terms & Conditions
            </Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.neutral.medium[3]}
            />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-light-2 pl-12"
            onPress={() => handleDocumentPress("privacy")}
          >
            <Text className="text-sm text-text-primary">Privacy Policy</Text>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={colors.neutral.medium[3]}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
