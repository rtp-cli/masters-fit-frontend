import React, { useState, useEffect, useCallback } from "react";
import { useThemeColors } from "../lib/theme";
import {
  View,
  Image,
  TouchableOpacity,
  Linking,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import YoutubePlayer from "react-native-youtube-iframe";
import Text from "./text";
import { images } from "@/assets";
import { trackVideoEngagement } from "@/lib/analytics";
import { useAuth } from "@/contexts/auth-context";
import { CustomDialog, DialogButton } from "./ui";

interface ExerciseLinkProps {
  link: string | null | undefined;
  exerciseName?: string;
  style?: ViewStyle;
  showFullVideo?: boolean;
  variant?: "default" | "hero";
  exerciseId?: number;
}

interface LinkInfo {
  type: "youtube" | "image" | "unknown";
  videoId?: string;
  thumbnailUrl?: string;
  isValid: boolean;
}

const ExerciseLink: React.FC<ExerciseLinkProps> = ({
  link,
  exerciseName = "Exercise",
  style,
  variant = "default",
  exerciseId,
}) => {
  const colors = useThemeColors();
  const [showVideo, setShowVideo] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const { user } = useAuth();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    description: string;
    primaryButton: DialogButton;
    secondaryButton?: DialogButton;
    icon?: keyof typeof Ionicons.glyphMap;
  } | null>(null);

  useEffect(() => {
    setImageError(false);
    setUseFallback(false);
    setShowVideo(false);
  }, [exerciseName]);

  const getPlaceholderImage = () => images.gymGeneric;

  const processExerciseLink = (url: string | null | undefined): LinkInfo => {
    if (!url) {
      return { type: "unknown", isValid: false };
    }

    try {
      const urlObj = new URL(url);

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
            videoId,
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
            isValid: true,
          };
        }
      }

      const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
      const isImage =
        imageExtensions.some((ext) => urlObj.pathname.toLowerCase().endsWith(ext)) ||
        urlObj.searchParams.has("format") ||
        urlObj.hostname.includes("images") ||
        urlObj.hostname.includes("img") ||
        urlObj.hostname.includes("cdn");

      if (isImage) {
        return { type: "image", isValid: true };
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

  const handlePlayPress = () => {
    if (exerciseId && exerciseName && link) {
      trackVideoEngagement({
        exercise_id: exerciseId,
        exercise_name: exerciseName,
        video_url: link,
      }).catch(console.warn);
    }
    setShowVideo(true);
  };

  const onPlayerError = useCallback(() => {
    // If the in-app player fails, open externally as fallback
    if (link) {
      Linking.openURL(link).catch(() => {});
    }
  }, [link]);

  const renderDialog = () => {
    if (!dialogConfig) return null;
    return (
      <CustomDialog
        visible={dialogVisible}
        onClose={() => setDialogVisible(false)}
        title={dialogConfig.title}
        description={dialogConfig.description}
        primaryButton={dialogConfig.primaryButton}
        secondaryButton={dialogConfig.secondaryButton}
        icon={dialogConfig.icon}
      />
    );
  };

  const renderPlaceholder = (height: string, size: number) => {
    const imageUrl = useFallback ? getPlaceholderImage() : getPlaceholderImage();

    return (
      <View className={`relative ${height}`}>
        {!imageError ? (
          <Image
            source={imageUrl}
            className="w-full h-full"
            resizeMode="cover"
            onError={() => {
              if (!useFallback) {
                setUseFallback(true);
              } else {
                setImageError(true);
              }
            }}
          />
        ) : (
          <View className="bg-neutral-light-2 h-full items-center justify-center">
            <Ionicons name="videocam-outline" size={size} color={colors.text.muted} />
            <Text
              variant={size > 32 ? "body" : "bodySmall"}
              color={colors.text.muted}
              className="mt-2 text-center"
            >
              No video demonstration available
            </Text>
          </View>
        )}
        <View className="absolute inset-0 bg-black/20" />
      </View>
    );
  };

  // No link -- show placeholder image
  if (!link) {
    if (variant === "hero") {
      return (
        <>
          {renderPlaceholder("h-80", 48)}
          {renderDialog()}
        </>
      );
    }
    return (
      <>
        <View className={`my-2 ${style ? "" : ""}`}>
          <View className="relative rounded-lg overflow-hidden">
            {renderPlaceholder("h-48", 32)}
          </View>
        </View>
        {renderDialog()}
      </>
    );
  }

  const linkInfo = processExerciseLink(link);

  // Non-YouTube or invalid link -- show placeholder
  if (!linkInfo.isValid || linkInfo.type !== "youtube" || !linkInfo.videoId) {
    if (variant === "hero") {
      return (
        <>
          {renderPlaceholder("h-80", 48)}
          {renderDialog()}
        </>
      );
    }
    return (
      <>
        <View className={`my-2 ${style ? "" : ""}`}>
          <View className="relative rounded-lg overflow-hidden">
            {renderPlaceholder("h-48", 32)}
          </View>
        </View>
        {renderDialog()}
      </>
    );
  }

  // YouTube video -- show in-app player or thumbnail
  const videoHeight = variant === "hero" ? 320 : 200;

  if (showVideo) {
    // In-app YouTube player
    if (variant === "hero") {
      return (
        <>
          <View className="relative" style={{ height: videoHeight }}>
            <YoutubePlayer
              height={videoHeight}
              videoId={linkInfo.videoId}
              play={true}
              onError={onPlayerError}
              webViewProps={{
                allowsInlineMediaPlayback: true,
                mediaPlaybackRequiresUserAction: false,
              }}
            />
            <TouchableOpacity
              className="absolute top-3 right-3 bg-black/60 rounded-full w-9 h-9 items-center justify-center z-10"
              onPress={() => setShowVideo(false)}
            >
              <Ionicons name="chevron-down" size={18} color="white" />
            </TouchableOpacity>
          </View>
          {renderDialog()}
        </>
      );
    }

    return (
      <>
        <View className={`my-2 ${style ? "" : ""}`}>
          <View className="flex-row items-center justify-between py-2 px-1">
            <View className="flex-row items-center flex-1">
              <Ionicons name="logo-youtube" size={16} color="#FF0000" />
              <Text
                variant="bodySmall"
                color={colors.text.primary}
                className="ml-1.5 flex-1"
              >
                {exerciseName} - Demonstration
              </Text>
            </View>
            <TouchableOpacity className="p-1" onPress={() => setShowVideo(false)}>
              <Ionicons name="chevron-up" size={16} color={colors.text.muted} />
            </TouchableOpacity>
          </View>
          <View className="rounded-lg overflow-hidden">
            <YoutubePlayer
              height={videoHeight}
              videoId={linkInfo.videoId}
              play={true}
              onError={onPlayerError}
              webViewProps={{
                allowsInlineMediaPlayback: true,
                mediaPlaybackRequiresUserAction: false,
              }}
            />
          </View>
        </View>
        {renderDialog()}
      </>
    );
  }

  // Thumbnail with play button
  if (variant === "hero") {
    return (
      <>
        <TouchableOpacity
          className="relative h-80"
          onPress={handlePlayPress}
          activeOpacity={0.85}
        >
          {!imageError ? (
            <Image
              source={{ uri: linkInfo.thumbnailUrl }}
              className="w-full h-full"
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View className="bg-neutral-light-2 h-full items-center justify-center">
              <Ionicons name="logo-youtube" size={48} color="#FF0000" />
              <Text variant="body" color={colors.text.muted} className="mt-3 text-center">
                Tap to play video
              </Text>
            </View>
          )}
          <View className="absolute inset-0 bg-black/20 items-center justify-center">
            <View className="bg-red-600 rounded-full w-20 h-20 items-center justify-center shadow-lg">
              <Ionicons name="play" size={32} color="white" />
            </View>
          </View>
        </TouchableOpacity>
        {renderDialog()}
      </>
    );
  }

  return (
    <>
      <View className={`my-2 ${style ? "" : ""}`}>
        <TouchableOpacity
          className="relative rounded-lg overflow-hidden"
          onPress={handlePlayPress}
          activeOpacity={0.85}
        >
          {!imageError ? (
            <Image
              source={{ uri: linkInfo.thumbnailUrl }}
              className="w-full h-48"
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <View className="bg-neutral-light-2 h-48 items-center justify-center">
              <Ionicons name="logo-youtube" size={32} color="#FF0000" />
              <Text variant="bodySmall" color={colors.text.muted} className="mt-2 text-center">
                Tap to play video
              </Text>
            </View>
          )}
          <View className="absolute inset-0 bg-black/20 items-center justify-center">
            <View className="bg-red-600 rounded-full w-16 h-16 items-center justify-center shadow-lg">
              <Ionicons name="play" size={24} color="white" />
            </View>
          </View>
        </TouchableOpacity>
      </View>
      {renderDialog()}
    </>
  );
};

export default ExerciseLink;
