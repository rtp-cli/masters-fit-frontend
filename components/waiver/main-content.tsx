import { Image, Text, View } from "react-native";
import { useThemeColors } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import { images } from "@/assets";
import { Ionicons } from "@expo/vector-icons";

interface MainContentProps {
  isUpdate: boolean;
}

export default function MainContent({ isUpdate }: MainContentProps) {
  const colors = useThemeColors();
  const { isDark } = useTheme();

  return (
    <>
      {/* Logo and Title */}
      <View className="px-6 items-center mb-4 mt-4">
        <View className="w-24 h-24 mb-6 rounded-2xl bg-primary items-center justify-center">
          <Image
            source={isDark ? images.logoDark : images.logo}
            className="w-16 h-16"
            resizeMode="contain"
          />
        </View>
        <View className="flex-row items-center mb-2">
          <Ionicons
            name="shield-checkmark"
            size={28}
            color={colors.brand.secondary}
          />
          <Text className="text-3xl font-bold text-text-primary text-center ml-2">
            {isUpdate ? "Updated Legal Agreement" : "Before You Begin"}
          </Text>
        </View>
        <Text className="text-base text-text-muted text-center">
          {isUpdate
            ? "Our terms have been updated. Please review and accept the new version"
            : "Please review and accept to continue"}
        </Text>
      </View>

      {/* Main Content */}
      <View className="px-6 mb-2">
        <View className="bg-surface rounded-xl p-5">
          <View className="flex-col items-start mb-1">
            <View className="flex-1">
              <Text className="text-base text-text-secondary leading-6 mb-3">
                MastersFit offers AI-powered fitness guidance, not medical
                advice. If you have any health concerns, check with your doctor
                before starting.
              </Text>
              <Text className="text-base text-text-secondary leading-6 mb-3">
                Our workouts are AI-powered, but AI isn't perfect — listen to
                your body and use your judgment.
              </Text>
              <Text className="text-base text-text-secondary leading-6 mb-3">
                By using MastersFit, you agree to exercise at your own risk.
                MastersFit LLC isn't liable for injuries or health issues that
                may occur.
              </Text>
              <Text className="text-base text-text-primary" style={{ fontFamily: "Inter_400Regular_Italic" }}>
                Individual results will vary — consistency and listening to your
                body matter most.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );
}
