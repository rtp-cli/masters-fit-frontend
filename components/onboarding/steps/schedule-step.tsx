import { Text, TouchableOpacity, View } from "react-native";

import CustomSlider from "@/components/ui/slider";
import {
  type ArrayFields,
  type ArrayValue,
  type FormData,
} from "@/types/components";
import { PREFERRED_DAYS } from "@/types/enums";

import { formatEnumValue } from "../utils/formatters";

interface ScheduleStepProps {
  formData: FormData;
  onFieldChange: (
    field: keyof FormData,
    value: FormData[keyof FormData]
  ) => void;
  onToggle: (field: ArrayFields, value: ArrayValue) => void;
  // §A3: on the edit screen the sessions line is a readout of the current
  // selection, so it moves below the chips and drops to one muted line — and the
  // "first plan" framing is wrong when you already have one.
  editScreen?: boolean;
}

// §5: new step split out of the old FITNESS_LEVEL — available days, the plan
// card, and session length.
export default function ScheduleStep({
  formData,
  onFieldChange,
  onToggle,
  editScreen = false,
}: ScheduleStepProps) {
  const dayCount = formData.availableDays.length;
  const sessionWord = dayCount === 1 ? "session" : "sessions";

  return (
    <View className="flex-1 px-6 pb-6">
      {/* Available days */}
      <View className="mb-8">
        <Text className="text-lg font-semibold text-neutral-dark-1 mb-4">
          Available days
        </Text>
        {/* Onboarding: a filled preamble card above the chips. §5.4: count
            sessions, not calendar dates — calculateWorkoutPlanDates() is a naive
            today+6 window, not the real anchored cycle. */}
        {!editScreen && dayCount >= 1 && (
          <View className="mb-4 p-4 bg-brand-light-1 rounded-xl">
            <Text className="text-sm font-semibold text-text-primary mb-1">
              Your first plan
            </Text>
            <Text className="text-sm text-text-primary">
              {dayCount} {sessionWord} a week. Change your days any time.
            </Text>
          </View>
        )}
        <View className="flex-row flex-wrap">
          {Object.entries(PREFERRED_DAYS).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              className={`p-3 rounded-lg mr-2 mb-2 ${
                formData.availableDays.includes(value)
                  ? "bg-primary"
                  : "bg-surface"
              }`}
              onPress={() => onToggle("availableDays", value)}
            >
              <Text
                className={`font-medium text-sm ${
                  formData.availableDays.includes(value)
                    ? "text-content-on-primary"
                    : "text-neutral-dark-1"
                }`}
              >
                {formatEnumValue(value)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Edit screen: one muted readout below the chips (§A3). */}
        {editScreen && dayCount >= 1 && (
          <Text className="mt-3 text-sm text-text-muted">
            {dayCount} {sessionWord} a week. Changes apply from your next plan.
          </Text>
        )}
      </View>

      {/* How long per session */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-neutral-dark-1">
          How long per session
        </Text>
        <CustomSlider
          value={formData.workoutDuration}
          minimumValue={15}
          maximumValue={90}
          step={5}
          onValueChange={(value) => onFieldChange("workoutDuration", value)}
          unit=" min"
        />
      </View>
    </View>
  );
}
