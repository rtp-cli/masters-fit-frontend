import React, { useState, useEffect } from "react";
import {
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Text from "./Text";

interface Exercise {
  id: number;
  name: string;
  link?: string;
}

interface ExerciseLinkModalProps {
  visible: boolean;
  exercise: Exercise | null;
  onClose: () => void;
  onSave: (exerciseId: number, link: string | null) => Promise<void>;
}

const ExerciseLinkModal: React.FC<ExerciseLinkModalProps> = ({
  visible,
  exercise,
  onClose,
  onSave,
}) => {
  const [link, setLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [linkType, setLinkType] = useState<"youtube" | "unknown">("unknown");

  useEffect(() => {
    if (exercise) {
      setLink(exercise.link || "");
      setLinkType(determineLinkType(exercise.link || ""));
    }
  }, [exercise]);

  const determineLinkType = (url: string): "youtube" | "unknown" => {
    if (!url) return "unknown";

    try {
      // Check for YouTube URLs only
      const youtubePatterns = [
        /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
        /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=.+/,
        /^(https?:\/\/)?(www\.)?youtu\.be\/.+/,
      ];

      const isYoutube = youtubePatterns.some((pattern) => pattern.test(url));
      if (isYoutube) return "youtube";

      return "unknown";
    } catch {
      return "unknown";
    }
  };

  const validateLink = (url: string): { isValid: boolean; error?: string } => {
    if (!url.trim()) {
      return { isValid: true }; // Empty is valid (will remove link)
    }

    try {
      new URL(url);
      const type = determineLinkType(url);

      if (type === "unknown") {
        return {
          isValid: false,
          error: "Please enter a valid YouTube video URL",
        };
      }

      return { isValid: true };
    } catch {
      return {
        isValid: false,
        error: "Please enter a valid URL",
      };
    }
  };

  const handleLinkChange = (text: string) => {
    setLink(text);
    setLinkType(determineLinkType(text));
  };

  const handleSave = async () => {
    if (!exercise) return;

    const validation = validateLink(link);
    if (!validation.isValid) {
      Alert.alert("Invalid URL", validation.error);
      return;
    }

    setIsLoading(true);
    try {
      await onSave(exercise.id, link.trim() || null);
      onClose();
    } catch (error) {
      Alert.alert("Error", "Failed to update exercise link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveLink = async () => {
    if (!exercise) return;

    Alert.alert(
      "Remove Link",
      "Are you sure you want to remove this exercise link?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setIsLoading(true);
            try {
              await onSave(exercise.id, null);
              onClose();
            } catch (error) {
              Alert.alert(
                "Error",
                "Failed to remove exercise link. Please try again."
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const getLinkTypeIcon = () => {
    switch (linkType) {
      case "youtube":
        return "logo-youtube";
      default:
        return "link";
    }
  };

  const getLinkTypeColor = () => {
    switch (linkType) {
      case "youtube":
        return "youtube";
      default:
        return "text-light";
    }
  };

  if (!exercise) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center justify-between px-md pt-md pb-3 border-b border-neutral-medium-1">
          <TouchableOpacity
            onPress={onClose}
            className="w-10 h-10 items-center justify-center"
          >
            <Ionicons name="close" size={24} color="neutral-dark-3" />
          </TouchableOpacity>
          <Text variant="h3" center>
            Exercise Link
          </Text>
          <View className="w-10" />
        </View>

        {/* Content */}
        <View className="flex-1 p-md">
          <Text variant="title" className="mb-2">
            {exercise.name}
          </Text>

          <Text variant="body" color="text-light" className="mb-6 leading-5">
            Add a YouTube video to help demonstrate this exercise.
          </Text>

          {/* Link Input */}
          <View className="mb-md">
            <Text variant="subtitle" className="mb-2">
              Exercise Link
            </Text>
            <View className="relative">
              <TextInput
                className="border border-neutral-medium-1 rounded-lg px-md py-3 text-base text-text-primary min-h-[48px] pr-12"
                value={link}
                onChangeText={handleLinkChange}
                placeholder="https://youtube.com/watch?v=... or https://example.com/image.jpg"
                placeholderTextColor="neutral-medium-5"
                multiline
                editable={!isLoading}
              />
              {link && (
                <View className="absolute right-md top-4">
                  <Ionicons
                    name={getLinkTypeIcon()}
                    size={16}
                    color={getLinkTypeColor()}
                  />
                </View>
              )}
            </View>
          </View>

          {/* Link Type Info */}
          {link && linkType !== "unknown" && (
            <View className="flex-row items-center mb-md">
              <Ionicons
                name="checkmark-circle"
                size={16}
                color="primary"
                className="mr-1.5"
              />
              <Text variant="bodySmall" color="primary">
                {linkType === "youtube"
                  ? "YouTube video detected"
                  : "Link detected"}
              </Text>
            </View>
          )}

          {link && linkType === "unknown" && (
            <View className="flex-row items-center mb-md">
              <Ionicons
                name="warning"
                size={16}
                color="warning"
                className="mr-1.5"
              />
              <Text variant="bodySmall" color="warning">
                Please enter a valid YouTube video URL
              </Text>
            </View>
          )}

          {/* Examples */}
          <View className="bg-neutral-light-1 rounded-lg p-md">
            <Text variant="subtitle" className="mb-2">
              Supported URL formats:
            </Text>
            <Text variant="bodySmall" color="text-light" className="mb-1">
              • YouTube: https://youtube.com/watch?v=abc123
            </Text>
            <Text variant="bodySmall" color="text-light" className="mb-1">
              • YouTube Short: https://youtu.be/abc123
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View className="p-md border-t border-neutral-medium-1">
          {exercise.link && (
            <TouchableOpacity
              className="flex-row items-center justify-center py-3 mb-3"
              onPress={handleRemoveLink}
              disabled={isLoading}
            >
              <Ionicons name="trash" size={16} color="error" />
              <Text variant="bodySmall" color="error" className="ml-1.5">
                Remove Link
              </Text>
            </TouchableOpacity>
          )}

          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 items-center justify-center py-3 rounded-lg border border-neutral-medium-1"
              onPress={onClose}
              disabled={isLoading}
            >
              <Text variant="body" color="text-light">
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 items-center justify-center py-3 rounded-lg ${
                isLoading || (link && linkType === "unknown")
                  ? "bg-neutral-medium-3"
                  : "bg-primary"
              }`}
              onPress={handleSave}
              disabled={!!(isLoading || (link && linkType === "unknown"))}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text variant="body" color="white" weight="semibold">
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ExerciseLinkModal;
