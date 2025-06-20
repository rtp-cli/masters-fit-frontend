import React, { useState, useEffect } from "react";
import {
  View,
  Image,
  TouchableOpacity,
  Alert,
  Linking,
  Dimensions,
  Text as RNText,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import Text from "./Text";

interface ExerciseLinkProps {
  link: string | null | undefined;
  exerciseName?: string;
  style?: any;
  showFullVideo?: boolean;
  variant?: "default" | "hero";
}

interface LinkInfo {
  type: "youtube" | "image" | "unknown";
  embedUrl?: string;
  thumbnailUrl?: string;
  isValid: boolean;
}

const ExerciseLink: React.FC<ExerciseLinkProps> = ({
  link,
  exerciseName = "Exercise",
  style,
  showFullVideo = false,
  variant = "default",
}) => {
  const [showModal, setShowModal] = useState(false);
  const [webViewError, setWebViewError] = useState(false);
  const [showVideo, setShowVideo] = useState(showFullVideo);
  const [imageError, setImageError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

  // Reset image error and fallback when exercise name changes
  useEffect(() => {
    setImageError(false);
    setUseFallback(false);
  }, [exerciseName]);

  // Generate exercise-specific image URL - now uses a single generic gym image
  const getExerciseImageUrl = (
    exerciseName: string,
    width: number = 800,
    height: number = 600
  ) => {
    // Use a single generic gym image instead of random ones
    const genericGymImage = require("../assets/gym-generic.jpg");

    return genericGymImage;
  };

  // Alternative fitness image service - also uses the same generic image
  const getFitnessImageUrl = (
    exerciseName: string,
    width: number = 800,
    height: number = 600
  ) => {
    // Use the same generic gym image instead of Unsplash
    const genericGymImage = require("../assets/gym-generic.jpg");

    return genericGymImage;
  };

  const processExerciseLink = (url: string | null | undefined): LinkInfo => {
    if (!url) {
      return { type: "unknown", isValid: false };
    }

    try {
      const urlObj = new URL(url);

      // Check for YouTube URLs
      const youtubePatterns = [
        /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
        /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=.+/,
        /^(https?:\/\/)?(www\.)?youtu\.be\/.+/,
      ];

      const isYoutube = youtubePatterns.some((pattern) => pattern.test(url));

      if (isYoutube) {
        const videoId = extractYouTubeVideoId(url);
        if (videoId) {
          return {
            type: "youtube",
            embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&showinfo=0&modestbranding=1`,
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            isValid: true,
          };
        }
      }

      // Check for image URLs
      const imageExtensions = [
        ".jpg",
        ".jpeg",
        ".png",
        ".gif",
        ".webp",
        ".svg",
      ];
      const isImage =
        imageExtensions.some((ext) =>
          urlObj.pathname.toLowerCase().endsWith(ext)
        ) ||
        urlObj.searchParams.has("format") ||
        urlObj.hostname.includes("images") ||
        urlObj.hostname.includes("img") ||
        urlObj.hostname.includes("cdn");

      if (isImage) {
        return {
          type: "image",
          embedUrl: url,
          isValid: true,
        };
      }

      return { type: "unknown", isValid: false };
    } catch (error) {
      return { type: "unknown", isValid: false };
    }
  };

  const extractYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  };

  const handleOpenInBrowser = async () => {
    if (!link) return;

    try {
      const supported = await Linking.canOpenURL(link);
      if (supported) {
        await Linking.openURL(link);
      } else {
        Alert.alert("Error", "Unable to open this link");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open link");
    }
  };

  if (!link) {
    // Show generic gym image when no link is available
    if (variant === "hero") {
      const imageUrl = useFallback
        ? getFitnessImageUrl(exerciseName, 800, 600)
        : getExerciseImageUrl(exerciseName, 800, 600);

      return (
        <View className="relative h-80">
          {!imageError ? (
            <Image
              source={imageUrl}
              className="w-full h-full"
              resizeMode="cover"
              onError={(error) => {
                console.log(
                  "❌ Image failed to load:",
                  error,
                  "trying fallback:",
                  !useFallback
                );
                if (!useFallback) {
                  setUseFallback(true);
                } else {
                  setImageError(true);
                }
              }}
            />
          ) : (
            <View className="bg-neutral-light-2 h-full items-center justify-center">
              <Ionicons name="videocam-outline" size={48} color="#9CA3AF" />
              <Text variant="body" color="#6B7280" className="mt-3 text-center">
                No video demonstration available
              </Text>
            </View>
          )}
          <View className="absolute inset-0 bg-black/20" />
        </View>
      );
    }

    const imageUrl = useFallback
      ? getFitnessImageUrl(exerciseName, 600, 400)
      : getExerciseImageUrl(exerciseName, 600, 400);

    return (
      <View className={`my-2 ${style ? "" : ""}`}>
        <View className="relative rounded-lg overflow-hidden">
          {!imageError ? (
            <Image
              source={imageUrl}
              className="w-full h-48"
              resizeMode="cover"
              onError={(error) => {
                console.log(
                  "❌ Image failed to load:",
                  error,
                  "trying fallback:",
                  !useFallback
                );
                if (!useFallback) {
                  setUseFallback(true);
                } else {
                  setImageError(true);
                }
              }}
            />
          ) : (
            <View className="bg-neutral-light-1 rounded-lg border border-dashed border-neutral-medium-1 p-8 items-center justify-center h-48">
              <Ionicons name="videocam-outline" size={32} color="#9CA3AF" />
              <Text
                variant="bodySmall"
                color="#6B7280"
                className="mt-2 text-center"
              >
                No video demonstration available
              </Text>
            </View>
          )}
          <View className="absolute inset-0 bg-black/10" />
        </View>
      </View>
    );
  }

  const linkInfo = processExerciseLink(link);

  // Only show YouTube videos, everything else gets generic gym images
  if (!linkInfo.isValid || linkInfo.type !== "youtube") {
    if (variant === "hero") {
      const imageUrl = useFallback
        ? getFitnessImageUrl(exerciseName, 800, 600)
        : getExerciseImageUrl(exerciseName, 800, 600);

      return (
        <View className="relative h-80">
          {!imageError ? (
            <Image
              source={imageUrl}
              className="w-full h-full"
              resizeMode="cover"
              onError={(error) => {
                console.log(
                  "❌ Image failed to load:",
                  error,
                  "trying fallback:",
                  !useFallback
                );
                if (!useFallback) {
                  setUseFallback(true);
                } else {
                  setImageError(true);
                }
              }}
            />
          ) : (
            <View className="bg-neutral-light-2 h-full items-center justify-center">
              <Ionicons name="videocam-outline" size={48} color="#9CA3AF" />
              <Text variant="body" color="#6B7280" className="mt-3 text-center">
                No video demonstration available
              </Text>
            </View>
          )}
          <View className="absolute inset-0 bg-black/20" />
        </View>
      );
    }

    const imageUrl = useFallback
      ? getFitnessImageUrl(exerciseName, 600, 400)
      : getExerciseImageUrl(exerciseName, 600, 400);

    return (
      <View className={`my-2 ${style ? "" : ""}`}>
        <View className="relative rounded-lg overflow-hidden">
          {!imageError ? (
            <Image
              source={imageUrl}
              className="w-full h-48"
              resizeMode="cover"
              onError={(error) => {
                console.log(
                  "❌ Image failed to load:",
                  error,
                  "trying fallback:",
                  !useFallback
                );
                if (!useFallback) {
                  setUseFallback(true);
                } else {
                  setImageError(true);
                }
              }}
            />
          ) : (
            <View className="bg-neutral-light-1 rounded-lg border border-dashed border-neutral-medium-1 p-8 items-center justify-center h-48">
              <Ionicons name="videocam-outline" size={32} color="#9CA3AF" />
              <Text
                variant="bodySmall"
                color="#6B7280"
                className="mt-2 text-center"
              >
                No video demonstration available
              </Text>
            </View>
          )}
          <View className="absolute inset-0 bg-black/10" />
        </View>
      </View>
    );
  }

  // Only YouTube videos reach this point
  if (linkInfo.type === "youtube") {
    const screenWidth = Dimensions.get("window").width;
    const containerWidth = screenWidth - (variant === "hero" ? 0 : 32); // No padding for hero
    const videoHeight = variant === "hero" ? 320 : (containerWidth * 9) / 16; // Fixed height for hero

    if (showVideo) {
      if (variant === "hero") {
        return (
          <View className="relative h-80">
            <View className="h-full bg-black">
              {!webViewError ? (
                <WebView
                  source={{ uri: linkInfo.embedUrl! }}
                  className="flex-1"
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  javaScriptEnabled
                  domStorageEnabled
                  onError={() => setWebViewError(true)}
                />
              ) : (
                <View className="flex-1 bg-red-50 items-center justify-center">
                  <Ionicons name="warning" size={48} color="#EF4444" />
                  <Text
                    variant="body"
                    color="#EF4444"
                    className="mt-3 text-center"
                  >
                    Failed to load video
                  </Text>
                  <TouchableOpacity
                    className="mt-4 bg-primary px-6 py-3 rounded-lg"
                    onPress={handleOpenInBrowser}
                  >
                    <Text variant="body" color="#181917" weight="semibold">
                      Open in Browser
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity
              className="absolute top-4 right-4 bg-black/60 rounded-full w-10 h-10 items-center justify-center"
              onPress={() => setShowVideo(false)}
            >
              <Ionicons name="chevron-down" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <View className={`my-2 ${style ? "" : ""}`}>
          <View className="flex-row items-center justify-between py-2 px-1">
            <View className="flex-row items-center flex-1">
              <Ionicons name="logo-youtube" size={16} color="#FF0000" />
              <Text
                variant="bodySmall"
                color="#374151"
                className="ml-1.5 flex-1"
              >
                {exerciseName} - Demonstration
              </Text>
            </View>
            <TouchableOpacity
              className="p-1"
              onPress={() => setShowVideo(false)}
            >
              <Ionicons name="chevron-up" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View
            className="rounded-lg overflow-hidden bg-black"
            style={{ height: videoHeight }}
          >
            {!webViewError ? (
              <WebView
                source={{ uri: linkInfo.embedUrl! }}
                className="flex-1"
                allowsInlineMediaPlayback
                mediaPlaybackRequiresUserAction={false}
                javaScriptEnabled
                domStorageEnabled
                onError={() => setWebViewError(true)}
              />
            ) : (
              <View className="flex-1 bg-red-50 items-center justify-center">
                <Ionicons name="warning" size={32} color="#EF4444" />
                <Text
                  variant="bodySmall"
                  color="#EF4444"
                  className="mt-1 text-center"
                >
                  Failed to load video
                </Text>
                <TouchableOpacity
                  className="mt-2 py-1 px-2"
                  onPress={handleOpenInBrowser}
                >
                  <Text variant="bodySmall" color="#BBDE51">
                    Open in Browser
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      );
    }

    // Show thumbnail
    if (variant === "hero") {
      return (
        <TouchableOpacity
          className="h-80 border border-gray-300 rounded-lg bg-white items-center justify-center"
          onPress={() => setShowVideo(true)}
        >
          <Ionicons name="play-circle-outline" size={48} color="#6B7280" />
          <Text
            variant="bodySmall"
            color="#6B7280"
            className="mt-2 text-center"
          >
            YouTube Video: {exerciseName}
          </Text>
        </TouchableOpacity>
      );
    }

    return (
      <View className={`my-2 ${style ? "" : ""}`}>
        <TouchableOpacity
          className="border border-gray-300 rounded-lg bg-white p-4 items-center justify-center h-32"
          onPress={() => setShowVideo(true)}
        >
          <Ionicons name="play-circle-outline" size={32} color="#6B7280" />
          <Text
            variant="bodySmall"
            color="#6B7280"
            className="mt-2 text-center"
          >
            YouTube Video: {exerciseName}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
};

export default ExerciseLink;
