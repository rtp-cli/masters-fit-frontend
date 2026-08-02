import { formatEnumValue } from "@utils/index";
import { Text, View } from "react-native";

import { formatHeight } from "@/components/onboarding/utils/formatters";

import EditableSectionCard from "./editable-section-card";

interface Profile {
  age?: number;
  height?: number;
  weight?: number;
  gender?: string;
}

interface PersonalInformationSectionProps {
  profile: Profile;
  onNavigate?: () => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="px-4 py-3 border-t border-neutral-light-2">
      <View className="flex-row justify-between items-center">
        <Text className="text-sm text-text-primary">{label}</Text>
        <Text className="text-sm text-text-muted">{value}</Text>
      </View>
    </View>
  );
}

// §9.2.1: "About you" — age, height, weight, gender. Opens onboarding step 1.
// Environment, fitness level, duration and intensity moved to their own cards.
export default function PersonalInformationSection({
  profile,
  onNavigate,
}: PersonalInformationSectionProps) {
  return (
    <EditableSectionCard title="About you" step="PERSONAL_INFO" onNavigate={onNavigate}>
      <Row
        label="Age"
        value={profile.age ? `${profile.age} years` : "Not specified"}
      />
      <Row
        label="Height"
        value={profile.height ? formatHeight(profile.height) : "Not specified"}
      />
      <Row
        label="Weight"
        value={profile.weight ? `${profile.weight} lbs` : "Not specified"}
      />
      <Row
        label="Gender"
        value={
          profile.gender ? formatEnumValue(profile.gender) : "Not specified"
        }
      />
    </EditableSectionCard>
  );
}
