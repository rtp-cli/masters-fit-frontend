import { Modal, View, TouchableOpacity, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/theme";
import { useTheme } from "@/lib/theme-context";
import SearchView from "./search-view";

interface SearchModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SearchModal({ visible, onClose }: SearchModalProps) {
  const colors = useThemeColors();
  const { isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      statusBarTranslucent
    >
      <SafeAreaView className={`flex-1 bg-background ${isDark ? "dark" : ""}`}>
        <View className="flex-row items-center justify-between p-4 border-b border-neutral-light-2">
          <View className="w-6" />
          <Text className="text-xl font-bold text-text-primary">Search</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <SearchView />
      </SafeAreaView>
    </Modal>
  );
}
