import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { colors } from "@/lib/theme";
import { images } from "@/assets";

export default function WaiverScreen() {
  const router = useRouter();
  const [isAgreed, setIsAgreed] = useState(false);

  const handleAgree = async () => {
    if (!isAgreed) {
      Alert.alert(
        "Agreement Required",
        "Please check the box to agree to the Waiver of Liability & Terms & Conditions before continuing."
      );
      return;
    }

    try {
      // Store waiver acceptance
      await SecureStore.setItemAsync("waiverAccepted", "true");
      await SecureStore.setItemAsync(
        "waiverAcceptedDate",
        new Date().toISOString()
      );

      // Navigate to login
      router.push("/(auth)/login");
    } catch (error) {
      console.error("Error storing waiver acceptance:", error);
      Alert.alert("Error", "Failed to save your agreement. Please try again.");
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Registration",
      "Are you sure you want to cancel? You must agree to the waiver to use MastersFit.",
      [
        {
          text: "Stay",
          style: "cancel",
        },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => router.back(),
        },
      ],
      { cancelable: true }
    );
  };

  const viewDocument = (type: "waiver" | "terms" | "privacy") => {
    router.push({
      pathname: "/legal-document",
      params: { type },
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-4 pb-2">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Logo and Title */}
        <View className="px-6 items-center mb-8 mt-4">
          <Image
            source={images.icon}
            className="w-24 h-24 mb-6 rounded-md"
            resizeMode="contain"
          />
          <Text className="text-3xl font-bold text-text-primary text-center mb-2">
            Before You Begin
          </Text>
          <Text className="text-base text-text-muted text-center">
            Please review and accept our legal agreements
          </Text>
        </View>

        {/* Main Content */}
        <View className="px-6 mb-2">
          <View className="bg-white rounded-xl p-5 shadow-sm">
            <View className="flex-col items-start mb-4">
              <View className="flex items-center justify-center flex-row mb-4">
                <Ionicons
                  name="warning"
                  size={24}
                  color={colors.brand.secondary}
                />
                <Text className="text-lg font-semibold text-text-primary ml-3">
                  Waiver of Liability & Assumption of Risk
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-base text-text-secondary leading-6 mb-3">
                  MastersFit provides fitness guidance only and is not medical
                  advice. Always check with your doctor before starting new
                  workouts.
                </Text>
                <Text className="text-base text-text-secondary leading-6 mb-3">
                  Our workouts are AI-powered, but AI isn't perfect — listen to
                  your body and use your judgment.
                </Text>
                <Text className="text-base text-text-secondary leading-6 mb-3">
                  By using this app, you agree to do so at your own risk and
                  release MastersFit LLC from any liability for injuries, health
                  issues, or damages.
                </Text>
                <Text className="text-base font-medium text-text-primary">
                  Results are not guaranteed.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Agreement Checkbox */}
        <View className="px-6 mb-6">
          <TouchableOpacity
            onPress={() => setIsAgreed(!isAgreed)}
            className="flex-row items-center bg-white rounded-xl p-4 shadow-sm"
          >
            <View
              className={`w-6 h-6 rounded-md border-2 mr-3 items-center justify-center ${
                isAgreed
                  ? "bg-brand-primary border-brand-primary"
                  : "bg-white border-neutral-medium-2"
              }`}
              style={
                isAgreed
                  ? {
                      backgroundColor: colors.brand.primary,
                      borderColor: colors.brand.primary,
                    }
                  : {}
              }
            >
              {isAgreed && (
                <Ionicons name="checkmark" size={16} color="white" />
              )}
            </View>
            <Text className="flex-1 text-base text-text-primary">
              I have read and accept all legal agreements
            </Text>
          </TouchableOpacity>
        </View>

        {/* Document Links */}
        <View className="px-6 mb-8">
          <View className="flex-row justify-center items-center flex-wrap">
            <TouchableOpacity
              onPress={() => viewDocument("terms")}
              className="flex-row items-center mx-2 mb-3"
            >
              <Ionicons
                name="newspaper-outline"
                size={16}
                color={colors.brand.primary}
              />
              <Text className="text-sm text-brand-primary ml-1 underline">
                Terms & Conditions
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => viewDocument("privacy")}
              className="flex-row items-center mx-2 mb-3"
            >
              <Ionicons
                name="lock-closed-outline"
                size={16}
                color={colors.brand.primary}
              />
              <Text className="text-sm text-brand-primary ml-1 underline">
                Privacy Policy
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => viewDocument("waiver")}
              className="flex-row items-center mx-2 mb-3"
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={16}
                color={colors.brand.primary}
              />
              <Text className="text-sm text-brand-primary ml-1 underline">
                Waiver of Liability
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View className="px-6 pb-6 pt-4 bg-white border-t border-neutral-light-2">
        <View className="flex-row gap-3">
          <TouchableOpacity
            className="flex-1 py-3 px-6 rounded-xl bg-red-500 items-center justify-center"
            onPress={handleCancel}
          >
            <Text className="text-white font-semibold">
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 py-4 px-6 rounded-xl items-center ${
              isAgreed ? "bg-brand-primary" : "bg-neutral-light-2"
            }`}
            style={isAgreed ? { backgroundColor: colors.brand.primary } : {}}
            onPress={handleAgree}
            disabled={!isAgreed}
          >
            <Text
              className={`text-base font-semibold ${
                isAgreed ? "text-white" : "text-neutral-medium-3"
              }`}
            >
              Continue
            </Text>
            </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
