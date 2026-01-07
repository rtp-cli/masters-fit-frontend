import { Image, Text, View } from "react-native";
import { useThemeColors } from "@/lib/theme";
import { images } from "@/assets";
import { Ionicons } from "@expo/vector-icons";

interface MainContentProps {
  isUpdate: boolean;
}

export default function MainContent({ isUpdate }: MainContentProps) {
  const colors = useThemeColors();

  return (
    <>
      {/* Logo and Title */}
      <View className="px-6 items-center mb-8 mt-4">
        <Image
          source={images.icon}
          className="w-24 h-24 mb-6 rounded-md"
          resizeMode="contain"
        />
        <Text className="text-3xl font-bold text-text-primary text-center mb-2">
          {isUpdate ? "Updated Legal Agreement" : "Before You Begin"}
        </Text>
        <Text className="text-base text-text-muted text-center">
          {isUpdate
            ? "Our terms have been updated. Please review and accept the new version"
            : "Please review and accept our legal agreements"}
        </Text>
      </View>

      {/* Main Content */}
      <View className="px-6 mb-2">
        <View className="bg-white rounded-xl p-5">
          <View className="flex-col items-start mb-4">
            <View className="flex items-center justify-center flex-row mb-4">
              <Ionicons
                name="warning"
                size={24}
                color={colors.brand.secondary}
              />
              <Text className="text-lg font-semibold text-text-primary ml-3">
                Waiver of Liability & Assumption of Risk
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-base text-text-secondary leading-6 mb-3">
                MastersFit provides fitness guidance only and is not medical
                advice. Always check with your doctor before starting new
                workouts.
              </Text>
              <Text className="text-base text-text-secondary leading-6 mb-3">
                Our workouts are AI-powered, but AI isn't perfect — listen to
                your body and use your judgment.
              </Text>
              <Text className="text-base text-text-secondary leading-6 mb-3">
                By using this app, you agree to do so at your own risk and
                release MastersFit LLC from any liability for injuries, health
                issues, or damages.
              </Text>
              <Text className="text-base font-medium text-text-primary">
                Results are not guaranteed.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );
}
