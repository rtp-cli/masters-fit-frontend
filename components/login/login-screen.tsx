import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/auth-context";
import { useThemeColors } from "../../lib/theme";
import { CustomDialog, DialogButton } from "../../components/ui";

export const LoginScreen = () => {
  const colors = useThemeColors();
  const router = useRouter();
  const { checkEmail, signup, login, setIsSigningUp } = useAuth();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [showNameField, setShowNameField] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    description: string;
    primaryButton: DialogButton;
    secondaryButton?: DialogButton;
    icon?: keyof typeof Ionicons.glyphMap;
  } | null>(null);

  const handleContinue = async () => {
    if (!email.trim()) {
      setDialogConfig({
        title: "Error",
        description: "Please enter your email address",
        primaryButton: {
          text: "OK",
          onPress: () => setDialogVisible(false),
        },
        icon: "alert-circle",
      });
      setDialogVisible(true);
      return;
    }
    setIsLoading(true);
    try {
      const response = await checkEmail(email.trim().toLowerCase());
      if (response.success) {
        if (response.needsOnboarding) {
          // Show name field for signup
          if (!response.user) {
            setShowNameField(true);
            return;
          }
          setIsLoading(false);
        }
        // Existing user, proceed with login
        setIsSigningUp(false);
        const loginResponse = await login({
          email: email.trim().toLowerCase(),
        });
        if (loginResponse.success) {
          router.push(
            `/(auth)/verify?email=${encodeURIComponent(
              email.trim().toLowerCase()
            )}`
          );
        } else {
          setDialogConfig({
            title: "Error",
            description: "Failed to login. Please try again.",
            primaryButton: {
              text: "OK",
              onPress: () => setDialogVisible(false),
            },
            icon: "alert-circle",
          });
          setDialogVisible(true);
        }
      } else {
        setDialogConfig({
          title: "Error",
          description: "Something went wrong. Please try again.",
          primaryButton: {
            text: "OK",
            onPress: () => setDialogVisible(false),
          },
          icon: "alert-circle",
        });
        setDialogVisible(true);
      }
    } catch (error) {
      setDialogConfig({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        primaryButton: {
          text: "OK",
          onPress: () => setDialogVisible(false),
        },
        icon: "alert-circle",
      });
      setDialogVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!name.trim()) {
      setDialogConfig({
        title: "Error",
        description: "Please enter your name",
        primaryButton: {
          text: "OK",
          onPress: () => setDialogVisible(false),
        },
        icon: "alert-circle",
      });
      setDialogVisible(true);
      return;
    }

    setIsLoading(true);
    try {
      setIsSigningUp(true);
      const signupResponse = await signup({
        email: email.trim().toLowerCase(),
        name: name.trim(),
      });

      if (signupResponse.success) {
        router.push(
          `/(auth)/verify?email=${encodeURIComponent(
            email.trim().toLowerCase()
          )}&isNewUser=true`
        );
      } else {
        setDialogConfig({
          title: "Error",
          description: "Failed to sign up. Please try again.",
          primaryButton: {
            text: "OK",
            onPress: () => setDialogVisible(false),
          },
          icon: "alert-circle",
        });
        setDialogVisible(true);
      }
    } catch (error) {
      setDialogConfig({
        title: "Error",
        description: "Failed to sign up. Please try again.",
        primaryButton: {
          text: "OK",
          onPress: () => setDialogVisible(false),
        },
        icon: "alert-circle",
      });
      setDialogVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    if (showNameField) {
      setShowNameField(false);
      setName("");
      setIsSigningUp(false);
    } else {
      router.back();
    }
  };

  const emailFilled = email.length > 0;
  const nameFilled = name.length > 0;

  const getInputStyle = (filled: boolean, focused: boolean, hasError = false) => ({
    height: 58,
    paddingHorizontal: 18,
    fontSize: 17,
    fontWeight: "500" as const,
    textAlign: "center" as const,
    borderWidth: 1.5,
    borderRadius: 16,
    borderColor: hasError
      ? colors.danger
      : filled || focused
      ? colors.brand.primary
      : colors.neutral.medium[1],
    backgroundColor: filled ? colors.surface : colors.background,
    color: colors.text.primary,
    ...(focused && {
      shadowColor: colors.brand.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    }),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />

      {/* Header — back chevron + centered brand lockup */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: 14,
          paddingHorizontal: 20,
        }}
      >
        <TouchableOpacity
          onPress={handleGoBack}
          style={{
            width: 40,
            height: 40,
            borderRadius: 9999,
            alignItems: "center",
            justifyContent: "center",
            marginLeft: -8,
          }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 14,
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Image
              source={require("../../assets/logo-dark.png")}
              style={{ width: 24, height: 22 }}
              resizeMode="contain"
            />
            <Text
              style={{
                fontSize: 17,
                fontWeight: "600",
                letterSpacing: -0.17,
                color: colors.text.primary,
              }}
            >
              MastersFit
            </Text>
          </View>
        </View>
      </View>

      {/* Body — centered vertically */}
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 24,
        }}
      >
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            letterSpacing: -0.56,
            lineHeight: 32.5,
            color: colors.text.primary,
            textAlign: "center",
          }}
        >
          {showNameField ? "Create Account" : "Welcome back"}
        </Text>
        <Text
          style={{
            fontSize: 15,
            lineHeight: 24,
            color: colors.text.muted,
            textAlign: "center",
            maxWidth: 280,
            alignSelf: "center",
            marginTop: 12,
          }}
        >
          {showNameField
            ? "Please enter your name to continue"
            : "Enter your email and we'll send you a sign-in code"}
        </Text>

        {/* Email input */}
        <TextInput
          style={[{ marginTop: 30 }, getInputStyle(emailFilled, isEmailFocused, !!emailError)]}
          placeholder="Email address"
          value={email}
          onChangeText={(t) => {
            setEmail(t);
            if (emailError) setEmailError("");
          }}
          onFocus={() => setIsEmailFocused(true)}
          onBlur={() => setIsEmailFocused(false)}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          inputMode="email"
          editable={!showNameField && !isLoading}
          placeholderTextColor={colors.text.muted}
          selectionColor={colors.brand.primary}
          returnKeyType="done"
          onSubmitEditing={handleContinue}
        />

        {/* Name input (signup flow) */}
        {showNameField && (
          <TextInput
            style={[{ marginTop: 12 }, getInputStyle(nameFilled, isNameFocused)]}
            placeholder="Full name"
            value={name}
            onChangeText={setName}
            onFocus={() => setIsNameFocused(true)}
            onBlur={() => setIsNameFocused(false)}
            autoCapitalize="words"
            editable={!isLoading}
            placeholderTextColor={colors.text.muted}
            selectionColor={colors.brand.primary}
            returnKeyType="done"
            onSubmitEditing={handleSignup}
          />
        )}
      </View>

      {/* Footer */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingBottom: 24,
          alignItems: "center",
          gap: 16,
        }}
      >
        {!showNameField && (
          <Text
            style={{
              fontSize: 13,
              color: colors.text.muted,
              textAlign: "center",
              maxWidth: 300,
            }}
          >
            Passwordless sign-in — no password to remember.
          </Text>
        )}
        <TouchableOpacity
          style={{
            width: "100%",
            height: 56,
            backgroundColor: colors.brand.primary,
            borderRadius: 9999,
            alignItems: "center",
            justifyContent: "center",
            opacity: isLoading ? 0.7 : 1,
          }}
          onPress={showNameField ? handleSignup : handleContinue}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.contentOnPrimary} />
          ) : (
            <Text
              style={{
                color: colors.contentOnPrimary,
                fontSize: 17,
                fontWeight: "600",
              }}
            >
              {showNameField ? "Sign Up" : "Continue"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Custom Dialog */}
      {dialogConfig && (
        <CustomDialog
          visible={dialogVisible}
          onClose={() => setDialogVisible(false)}
          title={dialogConfig.title}
          description={dialogConfig.description}
          primaryButton={dialogConfig.primaryButton}
          secondaryButton={dialogConfig.secondaryButton}
          icon={dialogConfig.icon}
        />
      )}
    </SafeAreaView>
  );
};
