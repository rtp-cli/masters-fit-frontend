import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CustomSlider from "@/components/ui/slider";
import { FormData } from "@/types/components";
import { GENDER } from "@/types/enums/fitness.enums";
import { useThemeColors } from "@/lib/theme";
import {
  convertCmToInches,
  convertInchesToCm,
  formatHeightFromInches,
} from "../utils/formatters";

interface PersonalInfoStepProps {
  formData: FormData;
  errors: Record<string, string>;
  onFieldChange: (
    field: keyof FormData,
    value: FormData[keyof FormData]
  ) => void;
}

export default function PersonalInfoStep({
  formData,
  errors,
  onFieldChange,
}: PersonalInfoStepProps) {
  const colors = useThemeColors();

  return (
    <View className="flex-1 px-6 pb-6">
      {/* Age slider */}
      <View className="mb-8">
        <Text className="text-lg font-semibold text-neutral-dark-1">Age</Text>
        <CustomSlider
          value={formData.age}
          minimumValue={18}
          maximumValue={80}
          step={1}
          onValueChange={(value) => onFieldChange("age", value)}
          unit=" yrs"
        />
        {errors.age && (
          <Text className="text-red-500 text-xs mt-2">{errors.age}</Text>
        )}
      </View>

      {/* Gender selection */}
      <View className="mb-8">
        <Text className="text-lg font-semibold text-neutral-dark-1 mb-4">
          Gender
        </Text>
        <View className="flex-row justify-between">
          <TouchableOpacity
            className={`flex-1 p-4 rounded-xl items-center mx-1 ${
              formData.gender === GENDER.MALE ? "bg-primary" : "bg-white"
            }`}
            onPress={() => onFieldChange("gender", GENDER.MALE)}
          >
            <View
              className={`w-8 h-8 rounded-full items-center justify-center mb-2 ${
                formData.gender === GENDER.MALE
                  ? "bg-white"
                  : "bg-neutral-light-2"
              }`}
            >
              <Ionicons
                name="male"
                size={14}
                color={
                  formData.gender === GENDER.MALE
                    ? colors.brand.primary
                    : colors.text.muted
                }
              />
            </View>
            <Text
              className={`font-medium text-xs ${
                formData.gender === GENDER.MALE
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Male
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 p-4 rounded-xl items-center mx-1 ${
              formData.gender === GENDER.FEMALE ? "bg-primary" : "bg-white"
            }`}
            onPress={() => onFieldChange("gender", GENDER.FEMALE)}
          >
            <View
              className={`w-8 h-8 rounded-full items-center justify-center mb-2 ${
                formData.gender === GENDER.FEMALE
                  ? "bg-white"
                  : "bg-neutral-light-2"
              }`}
            >
              <Ionicons
                name="female"
                size={14}
                color={
                  formData.gender === GENDER.FEMALE
                    ? colors.brand.primary
                    : colors.text.muted
                }
              />
            </View>
            <Text
              className={`font-medium text-xs ${
                formData.gender === GENDER.FEMALE
                  ? "text-secondary"
                  : "text-neutral-dark-1"
              }`}
            >
              Female
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Height slider */}
      <View className="mb-8">
        <Text className="text-lg font-semibold text-neutral-dark-1">
          Height
        </Text>
        <CustomSlider
          value={convertCmToInches(formData.height)}
          minimumValue={48} // 4'0" in inches
          maximumValue={96} // 8'0" in inches
          step={1}
          onValueChange={(value) =>
            onFieldChange("height", convertInchesToCm(value))
          }
          formatValue={(value) => formatHeightFromInches(value)}
          formatMinMax={(value) => formatHeightFromInches(value)}
        />
        {errors.height && (
          <Text className="text-red-500 text-xs mt-2">{errors.height}</Text>
        )}
      </View>

      {/* Weight slider */}
      <View className="mb-6">
        <Text className="text-lg font-semibold text-neutral-dark-1">
          Weight
        </Text>
        <CustomSlider
          value={formData.weight}
          minimumValue={100}
          maximumValue={300}
          step={1}
          onValueChange={(value) => onFieldChange("weight", value)}
          unit=" lbs"
        />
        {errors.weight && (
          <Text className="text-red-500 text-xs mt-2">{errors.weight}</Text>
        )}
      </View>
    </View>
  );
}
