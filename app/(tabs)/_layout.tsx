import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, TouchableOpacity, Image } from "react-native";

function TabBarIcon({
  name,
  color,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return <Ionicons size={24} name={name} color={color} />;
}

function WorkoutTabIcon({ focused }: { focused: boolean }) {
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 24,
        backgroundColor: "#000000",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 6,
      }}
    >
      <Ionicons size={20} name="play" color="#ffffff" />
    </View>
  );
}

function HeaderLogo() {
  return (
    <Image
      source={require("../../assets/logo.png")}
      style={{
        width: 120,
        height: 30,
        resizeMode: "contain",
      }}
    />
  );
}

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: true,
          tabBarActiveTintColor: "#1f2937",
          tabBarInactiveTintColor: "#9ca3af",
          tabBarStyle: {
            borderTopWidth: 1,
            borderTopColor: "#e5e7eb",
            height: 65,
            paddingBottom: 12,
            paddingTop: 6,
            backgroundColor: "#ffffff",
          },
          headerStyle: {
            backgroundColor: "#ffffff",
            height: 80,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 2,
          },
          headerTitleStyle: {
            fontWeight: "bold",
            fontSize: 18,
          },
          headerTitle: () => <HeaderLogo />,
          headerTitleAlign: "center",
        }}
      >
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
          name="dashboard"
          options={{
            title: "Progress",
            tabBarIcon: ({ color }: { color: string }) => (
              <TabBarIcon name="bar-chart" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="workout"
          options={{
            title: "Workout",
            tabBarIcon: ({ focused }: { focused: boolean }) => (
              <WorkoutTabIcon focused={focused} />
            ),
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
    </View>
  );
}
