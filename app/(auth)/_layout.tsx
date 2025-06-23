import { Stack } from "expo-router";
import { View } from "react-native";
import { colors } from "../../lib/theme";

export default function AuthLayout() {
  return (
    <View className="flex-1">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="verify" />
        <Stack.Screen name="onboarding" />
      </Stack>
    </View>
  );
}
