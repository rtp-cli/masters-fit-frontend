import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Platform, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@components/Header";
import { colors } from "../../lib/theme";

function TabBarIcon({
  name,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return <Ionicons size={28} name={name} color={color} />;
}

function WorkoutTabIcon() {
  return (
    <View className="w-[60px] h-[60px] rounded-[28px] bg-secondary items-center justify-center mb-5 shadow-lg">
      <Ionicons size={28} name="play" color={colors.neutral.white} />
    </View>
  );
}

export default function TabLayout() {
  const statusBarHeight =
    Platform.OS === "ios" ? 44 : StatusBar.currentHeight || 24;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Header />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.text.primary,
          tabBarInactiveTintColor: colors.neutral.medium[3],
          tabBarShowLabel: false,
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: colors.neutral.medium[1],
            height: 60,
            paddingBottom: 15,
            paddingTop: 8,
            backgroundColor: colors.background,
            minHeight: 60,
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            tabBarIcon: ({ color }: { color: string }) => (
              <TabBarIcon name="bar-chart" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            tabBarIcon: ({ color }: { color: string }) => (
              <TabBarIcon name="calendar" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="workout"
          options={{
            tabBarIcon: () => <WorkoutTabIcon />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            tabBarIcon: ({ color }: { color: string }) => (
              <TabBarIcon name="search" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            tabBarIcon: ({ color }: { color: string }) => (
              <TabBarIcon name="person" color={color} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
