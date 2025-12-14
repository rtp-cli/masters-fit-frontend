import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../lib/theme";

interface ComingSoonModalProps {
  visible: boolean;
  onClose: () => void;
  icon: keyof typeof Ionicons.glyphMap;
}

export default function ComingSoonModal({
  visible,
  onClose,
  icon,
}: ComingSoonModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <TouchableWithoutFeedback>
            <View className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl items-center">
              {/* Icon */}
              <View className="w-16 h-16 rounded-full bg-primary/10 items-center justify-center mb-4">
                <Ionicons name={icon} size={32} color={colors.brand.primary} />
              </View>

              {/* Title */}
              <Text className="text-xl font-bold text-text-primary mb-2 text-center">
                Coming Soon!
              </Text>

              {/* Description */}
              <Text className="text-base text-text-secondary text-center mb-6 leading-6">
                Oops — you caught us mid-workout! This feature isn’t live yet
                but will be ready soon. Stay tuned for updates!
              </Text>

              {/* Close Button */}
              <TouchableOpacity
                className="bg-primary rounded-xl py-3 px-8 flex-row items-center justify-center"
                onPress={onClose}
              >
                <Text className="text-white font-semibold text-base">
                  Got it!
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
