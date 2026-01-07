import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useThemeColors } from "../lib/theme";
import Text from "./text";

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
  const colors = useThemeColors();
  const [link, setLink] = useState("");
  const [linkType, setLinkType] = useState<"youtube" | "unknown">("unknown");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (exercise?.link) {
      setLink(exercise.link);
      setLinkType(determineLinkType(exercise.link));
    } else {
      setLink("");
      setLinkType("unknown");
    }
  }, [exercise]);

  const determineLinkType = (url: string): "youtube" | "unknown" => {
    if (!url) return "unknown";

    try {
      const _urlObj = new URL(url);

      // Check for YouTube URLs
      const youtubePatterns = [
        /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
        /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=.+/,
        /^(https?:\/\/)?(www\.)?youtu\.be\/.+/,
      ];

      const isYoutube = youtubePatterns.some((pattern) => pattern.test(url));

      if (isYoutube) {
        return "youtube";
      }

      return "unknown";
    } catch (error) {
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
    } catch (error) {
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
    const validation = validateLink(link);
    if (!validation.isValid) {
      Alert.alert("Invalid Link", validation.error || "Please check your link");
      return;
    }

    setIsLoading(true);
    try {
      await onSave(exercise!.id, link.trim() || null);
      onClose();
    } catch (error) {
      Alert.alert("Error", "Failed to save exercise link. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveLink = async () => {
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
              await onSave(exercise!.id, null);
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
        return colors.brand.primary;
      default:
        return colors.text.muted;
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
            className="size-10 items-center justify-center"
          >
            <Ionicons name="close" size={24} color={colors.text.primary} />
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

          <Text
            variant="body"
            color={colors.text.muted}
            className="mb-6 leading-5"
          >
            Add a YouTube video to help demonstrate this exercise.
          </Text>

          {/* Link Input */}
          <View className="mb-md">
            <Text variant="subtitle" className="mb-2">
              Exercise Link
            </Text>
            <View className="relative">
              <TextInput
                className="border border-neutral-medium-1 rounded-lg px-md py-3 text-base text-text-primary min-h-3xl pr-12"
                value={link}
                onChangeText={handleLinkChange}
                placeholder="https://youtube.com/watch?v=... or https://example.com/image.jpg"
                placeholderTextColor={colors.text.muted}
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
                color={colors.brand.primary}
              />
              <Text variant="bodySmall" color={colors.brand.primary}>
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
                color={colors.brand.secondary}
              />
              <Text variant="bodySmall" color={colors.brand.primary}>
                Please enter a valid YouTube video URL
              </Text>
            </View>
          )}

          {/* Examples */}
          <View className="bg-neutral-light-1 rounded-lg p-md">
            <Text variant="subtitle" className="mb-2">
              Supported URL formats:
            </Text>
            <Text
              variant="bodySmall"
              color={colors.text.muted}
              className="mb-1"
            >
              • YouTube: https://youtube.com/watch?v=abc123
            </Text>
            <Text
              variant="bodySmall"
              color={colors.text.muted}
              className="mb-1"
            >
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
              <Ionicons name="trash" size={16} color={colors.brand.secondary} />
              <Text
                variant="bodySmall"
                color={colors.brand.primary}
                className="ml-1.5"
              >
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
              <Text variant="body" color={colors.text.muted}>
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
                <ActivityIndicator size="small" color={colors.neutral.white} />
              ) : (
                <Text className="text-white font-semibold text-sm">
                  Link Exercise
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
