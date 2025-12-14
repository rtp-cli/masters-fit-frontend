import { Modal, View, TouchableOpacity, Text } from "react-native";
import SettingsView from "./settings-view";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsModal({
  visible,
  onClose,
}: SettingsModalProps) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-background">
        <View className="flex-row items-center justify-between p-4 border-b border-neutral-light-2">
          <View className="w-6" />
          <Text className="text-xl font-bold text-text-primary">Account</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        <SettingsView onClose={onClose} />
      </View>
    </Modal>
  );
}
