import { TouchableOpacity, View, Text } from "react-native";

interface BottomActionsProps {
  isAgreed: boolean;
  isLoading: boolean;
  onCancel: () => void;
  onContinue: () => void;
}

export default function BottomActions({ isAgreed, isLoading, onCancel, onContinue }: BottomActionsProps) {
  return (
    <View className="px-6 pb-6 pt-4 bg-white border-t border-neutral-light-2">
      <View className="flex-row gap-3">
        <TouchableOpacity className="flex-1 py-3 px-6 rounded-xl bg-red-500 items-center justify-center" onPress={onCancel}>
          <Text className="text-white font-semibold">Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 py-4 px-6 rounded-xl items-center ${isAgreed && !isLoading ? "bg-brand-primary" : "bg-neutral-light-2"}`}
          onPress={onContinue}
          disabled={!isAgreed || isLoading}
        >
          <Text className={`text-base font-semibold ${isAgreed && !isLoading ? "text-white" : "text-neutral-medium-3"}`}>
            {isLoading ? "Saving..." : "Continue"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}