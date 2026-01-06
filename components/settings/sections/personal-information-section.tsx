import { View, Text } from "react-native";
import { formatEnumValue, getIntensityText } from "@utils/index";
import { formatHeight } from "@/components/onboarding/utils/formatters";

interface Profile {
  age?: number;
  height?: number;
  weight?: number;
  gender?: string;
  environment?: string | null;
  fitnessLevel?: string;
  workoutDuration?: number;
  intensityLevel?: string | number | null;
}

interface PersonalInformationSectionProps {
  profile: Profile;
}

export default function PersonalInformationSection({
  profile,
}: PersonalInformationSectionProps) {
  // Get fitness level display
  const getFitnessLevelDisplay = (level: string | undefined) => {
    if (!level) return "Not specified";
    return formatEnumValue(level);
  };

  // Handle environment display with robust error handling
  const getEnvironmentDisplay = (environment: string | undefined | null) => {
    if (!environment || environment === "") return "Not specified";
    try {
      return formatEnumValue(environment);
    } catch (error) {
      console.error("Environment formatting error:", error);
      return environment;
    }
  };

  // Get intensity level display with robust error handling
  const getIntensityLevelDisplay = (
    level: string | number | undefined | null
  ) => {
    if (!level || level === "") return "Not specified";

    try {
      // Handle string intensity levels ("low", "moderate", "high") - primary case
      if (typeof level === "string") {
        // Handle legacy numeric strings like "3" -> convert to proper text
        if (level === "1") return "Low";
        if (level === "2") return "Moderate";
        if (level === "3") return "High";

        // Handle proper enum strings
        return formatEnumValue(level);
      }

      // Handle numeric intensity levels (1-5 scale) - fallback for legacy data
      if (typeof level === "number") {
        if (level <= 3) {
          // Convert 1-3 scale to proper enum values
          return level === 1 ? "Low" : level === 2 ? "Moderate" : "High";
        } else {
          // Use 1-5 scale
          return getIntensityText(level);
        }
      }
    } catch (error) {
      console.error("Intensity level formatting error:", error);
      return String(level);
    }

    return "Not specified";
  };

  return (
    <View className="px-6 mb-6 bg-white rounded-xl overflow-hidden">
      <Text className="text-base font-semibold text-text-primary p-4 pb-2">
        Personal Information
      </Text>

      <View className="px-4 py-3 border-t border-neutral-light-2">
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-text-primary">Age</Text>
          <Text className="text-sm text-text-muted">
            {profile.age ? `${profile.age} years` : "Not specified"}
          </Text>
        </View>
      </View>

      <View className="px-4 py-3 border-t border-neutral-light-2">
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-text-primary">Height</Text>
          <Text className="text-sm text-text-muted">
            {profile.height ? formatHeight(profile.height) : "Not specified"}
          </Text>
        </View>
      </View>

      <View className="px-4 py-3 border-t border-neutral-light-2">
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-text-primary">Weight</Text>
          <Text className="text-sm text-text-muted">
            {profile.weight ? `${profile.weight} lbs` : "Not specified"}
          </Text>
        </View>
      </View>

      <View className="px-4 py-3 border-t border-neutral-light-2">
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-text-primary">Gender</Text>
          <Text className="text-sm text-text-muted">
            {profile.gender ? formatEnumValue(profile.gender) : "Not specified"}
          </Text>
        </View>
      </View>

      <View className="px-4 py-3 border-t border-neutral-light-2">
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-text-primary">Environment</Text>
          <Text className="text-sm text-text-muted">
            {getEnvironmentDisplay(profile.environment)}
          </Text>
        </View>
      </View>

      <View className="px-4 py-3 border-t border-neutral-light-2">
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-text-primary">Fitness Level</Text>
          <Text className="text-sm text-text-muted">
            {getFitnessLevelDisplay(profile.fitnessLevel)}
          </Text>
        </View>
      </View>

      <View className="px-4 py-3 border-t border-neutral-light-2">
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-text-primary">Workout Duration</Text>
          <Text className="text-sm text-text-muted">
            {profile.workoutDuration
              ? `${profile.workoutDuration} minutes`
              : "Not specified"}
          </Text>
        </View>
      </View>

      <View className="px-4 py-3 border-t border-neutral-light-2">
        <View className="flex-row justify-between items-center">
          <Text className="text-sm text-text-primary">Intensity Level</Text>
          <Text className="text-sm text-text-muted">
            {getIntensityLevelDisplay(profile.intensityLevel)}
          </Text>
        </View>
      </View>
    </View>
  );
}
