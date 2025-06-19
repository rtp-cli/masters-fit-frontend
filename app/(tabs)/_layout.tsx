import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Platform, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@components/Header";

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
    <View
      style={{
        width: 60,
        height: 60,
        borderRadius: 28,
        backgroundColor: "#000000",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 6,
      }}
    >
      <Ionicons size={28} name="play" color="#ffffff" />
    </View>
  );
}

export default function TabLayout() {
  const statusBarHeight =
    Platform.OS === "ios" ? 44 : StatusBar.currentHeight || 24;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <Header />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#1f2937",
          tabBarInactiveTintColor: "#9ca3af",
          tabBarShowLabel: false,
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: "#e5e7eb",
            height: 60,
            paddingBottom: 15,
            paddingTop: 8,
            backgroundColor: "#ffffff",
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
