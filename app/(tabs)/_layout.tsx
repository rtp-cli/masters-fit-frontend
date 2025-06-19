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
  return <Ionicons size={26} name={name} color={color} />;
}

function WorkoutTabIcon() {
  return (
    <View
      style={{
        width: 50,
        height: 50,
        borderRadius: 28,
        backgroundColor: "#000000",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 6,
      }}
    >
      <Ionicons size={24} name="play" color="#ffffff" />
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
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: "#e5e7eb",
            height: 85,
            paddingBottom: 20,
            paddingTop: 10,
            backgroundColor: "#ffffff",
            minHeight: 85,
          },
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Progress",
            tabBarIcon: ({ color }: { color: string }) => (
              <TabBarIcon name="bar-chart" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            title: "Plan",
            tabBarIcon: ({ color }: { color: string }) => (
              <TabBarIcon name="calendar" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="workout"
          options={{
            title: "Workout",
            tabBarIcon: () => <WorkoutTabIcon />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: "Search",
            tabBarIcon: ({ color }: { color: string }) => (
              <TabBarIcon name="search" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Profile",
            tabBarIcon: ({ color }: { color: string }) => (
              <TabBarIcon name="person" color={color} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
