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
  errors: Record<string, string>;
  onFieldChange: (
    field: keyof FormData,
    value: FormData[keyof FormData]
  ) => void;
  onToggle: (field: ArrayFields, value: ArrayValue) => void;
}

// §5: new step split out of the old FITNESS_LEVEL — available days, the plan
// card, and session length.
export default function ScheduleStep({
  formData,
  errors,
  onFieldChange,
  onToggle,
}: ScheduleStepProps) {
  const dayCount = formData.availableDays.length;

  return (
    <View className="flex-1 px-6 pb-6">
      {/* Available days */}
      <View className="mb-8">
        <Text className="text-lg font-semibold text-neutral-dark-1 mb-4">
          Available days
        </Text>
        {/* §5.4: count sessions, not calendar dates — calculateWorkoutPlanDates()
            is a naive today+6 window, not the real anchored cycle. */}
        {dayCount >= 1 && (
          <View className="mb-4 p-4 bg-brand-light-1 rounded-xl">
            <Text className="text-sm font-semibold text-text-primary mb-1">
              Your first plan
            </Text>
            <Text className="text-sm text-text-primary">
              {dayCount} {dayCount === 1 ? "session" : "sessions"} a week. Change
              your days any time.
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
        {errors.availableDays && (
          <Text className="text-red-500 text-xs mt-2">
            {errors.availableDays}
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
        {errors.workoutDuration && (
          <Text className="text-red-500 text-xs mt-2">
            {errors.workoutDuration}
          </Text>
        )}
      </View>
    </View>
  );
}
