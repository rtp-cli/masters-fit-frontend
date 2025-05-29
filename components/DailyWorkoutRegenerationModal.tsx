import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface DailyWorkoutRegenerationModalProps {
  visible: boolean;
  onClose: () => void;
  onRegenerate: (reason: string) => void;
  loading?: boolean;
  dayNumber?: number;
}

export default function DailyWorkoutRegenerationModal({
  visible,
  onClose,
  onRegenerate,
  loading = false,
  dayNumber,
}: DailyWorkoutRegenerationModalProps) {
  const [regenerationReason, setRegenerationReason] = useState("");

  const handleSubmit = () => {
    if (regenerationReason.trim()) {
      onRegenerate(regenerationReason.trim());
      setRegenerationReason("");
    }
  };

  const handleClose = () => {
    setRegenerationReason("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Regenerate Day {dayNumber} Workout</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <Text style={styles.description}>
            Tell us why you want to regenerate this day's workout and what you'd
            like to change:
          </Text>

          <TextInput
            style={styles.textArea}
            value={regenerationReason}
            onChangeText={setRegenerationReason}
            placeholder="e.g., I want more cardio exercises, less leg focus, different equipment..."
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />

          <Text style={styles.note}>
            Only this day's workout will be changed. All other days will remain
            the same.
          </Text>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleClose}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.regenerateButton,
              loading && styles.buttonDisabled,
              !regenerationReason.trim() && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading || !regenerationReason.trim()}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="refresh" size={20} color="#ffffff" />
                <Text style={styles.regenerateButtonText}>
                  Regenerate Workout
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  description: {
    fontSize: 16,
    color: "#374151",
    marginBottom: 20,
    lineHeight: 24,
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#374151",
    backgroundColor: "#ffffff",
    minHeight: 140,
    textAlignVertical: "top",
    marginBottom: 16,
  },
  note: {
    fontSize: 14,
    color: "#6b7280",
    fontStyle: "italic",
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
  },
  cancelButtonText: {
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "600",
  },
  regenerateButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4f46e5",
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  regenerateButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
