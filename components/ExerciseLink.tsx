import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,
  Linking,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WebView } from "react-native-webview";
import {
  isYouTubeUrl,
  isImageUrl,
  getYouTubeVideoId,
  getYouTubeThumbnail,
  getYouTubeEmbedUrl,
} from "@utils/exerciseUtils";

interface ExerciseLinkProps {
  link: string;
  exerciseName: string;
}

export default function ExerciseLink({
  link,
  exerciseName,
}: ExerciseLinkProps) {
  const [showModal, setShowModal] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

  if (!link) return null;

  const handleLinkPress = () => {
    if (isYouTubeUrl(link)) {
      setShowModal(true);
    } else if (isImageUrl(link)) {
      setShowModal(true);
    } else {
      // For other links, open in browser
      Linking.openURL(link).catch(() => {
        Alert.alert("Error", "Unable to open link");
      });
    }
  };

  const renderThumbnail = () => {
    if (isYouTubeUrl(link)) {
      const videoId = getYouTubeVideoId(link);
      if (videoId) {
        return (
          <View style={{ alignItems: "center", marginVertical: 12 }}>
            <TouchableOpacity
              onPress={handleLinkPress}
              style={{
                position: "relative",
                borderRadius: 8,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Image
                source={{ uri: getYouTubeThumbnail(videoId) }}
                style={{
                  width: screenWidth - 80,
                  height: (screenWidth - 80) * 0.56, // 16:9 aspect ratio
                  backgroundColor: "#f0f0f0",
                }}
                resizeMode="cover"
              />
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: "rgba(0,0,0,0.3)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 30,
                    backgroundColor: "rgba(255,255,255,0.9)",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="play" size={24} color="#FF0000" />
                </View>
              </View>
            </TouchableOpacity>
            <Text
              style={{
                fontSize: 12,
                color: "#8A93A2",
                marginTop: 8,
                textAlign: "center",
              }}
            >
              Tap to watch exercise demonstration
            </Text>
          </View>
        );
      }
    } else if (isImageUrl(link)) {
      return (
        <View style={{ alignItems: "center", marginVertical: 12 }}>
          <TouchableOpacity
            onPress={handleLinkPress}
            style={{
              borderRadius: 8,
              overflow: "hidden",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Image
              source={{ uri: link }}
              style={{
                width: screenWidth - 80,
                height: 200,
                backgroundColor: "#f0f0f0",
              }}
              resizeMode="cover"
              onError={() => setImageError(true)}
            />
          </TouchableOpacity>
          <Text
            style={{
              fontSize: 12,
              color: "#8A93A2",
              marginTop: 8,
              textAlign: "center",
            }}
          >
            Tap to view full size
          </Text>
        </View>
      );
    }

    // For other links, show a generic link button
    return (
      <TouchableOpacity
        onPress={handleLinkPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#f8f9fa",
          padding: 12,
          borderRadius: 8,
          marginVertical: 8,
        }}
      >
        <Ionicons name="link-outline" size={16} color="#007AFF" />
        <Text
          style={{
            fontSize: 14,
            color: "#007AFF",
            marginLeft: 8,
            flex: 1,
          }}
        >
          View exercise reference
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#8A93A2" />
      </TouchableOpacity>
    );
  };

  const renderModal = () => {
    if (isYouTubeUrl(link)) {
      const videoId = getYouTubeVideoId(link);
      if (videoId) {
        return (
          <Modal
            visible={showModal}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowModal(false)}
          >
            <View style={{ flex: 1, backgroundColor: "#000" }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 16,
                  backgroundColor: "#fff",
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: "600", flex: 1 }}>
                  {exerciseName}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color="#000" />
                </TouchableOpacity>
              </View>
              <WebView
                source={{ uri: getYouTubeEmbedUrl(videoId) }}
                style={{ flex: 1 }}
                allowsFullscreenVideo
                mediaPlaybackRequiresUserAction={false}
              />
            </View>
          </Modal>
        );
      }
    } else if (isImageUrl(link)) {
      return (
        <Modal
          visible={showModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowModal(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.9)",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <TouchableOpacity
              style={{
                position: "absolute",
                top: 50,
                right: 20,
                zIndex: 1,
              }}
              onPress={() => setShowModal(false)}
            >
              <Ionicons name="close" size={30} color="#fff" />
            </TouchableOpacity>
            <Image
              source={{ uri: link }}
              style={{
                width: screenWidth - 40,
                height: screenHeight - 200,
              }}
              resizeMode="contain"
            />
          </View>
        </Modal>
      );
    }
    return null;
  };

  if (imageError && isImageUrl(link)) {
    return (
      <TouchableOpacity
        onPress={handleLinkPress}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#f8f9fa",
          padding: 12,
          borderRadius: 8,
          marginVertical: 8,
        }}
      >
        <Ionicons name="image-outline" size={16} color="#007AFF" />
        <Text
          style={{
            fontSize: 14,
            color: "#007AFF",
            marginLeft: 8,
            flex: 1,
          }}
        >
          View exercise image
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#8A93A2" />
      </TouchableOpacity>
    );
  }

  return (
    <View>
      {renderThumbnail()}
      {renderModal()}
    </View>
  );
}
