import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { AuthProvider } from "@contexts/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <View style={{ flex: 1 }}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </View>
    </AuthProvider>
  );
}
