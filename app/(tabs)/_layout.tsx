import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Platform,
  StatusBar,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@components/Header";
import { colors } from "../../lib/theme";
import { useWorkout } from "@/contexts/WorkoutContext";

function TabBarIcon({
  name,
  color,
  disabled = false,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  disabled?: boolean;
}) {
  return (
    <View style={{ opacity: disabled ? 0.4 : 1 }}>
      <Ionicons size={28} name={name} color={color} />
    </View>
  );
}

function WorkoutTabIcon() {
  return (
    <View className="w-[60px] h-[60px] rounded-[28px] bg-secondary items-center justify-center mb-5 shadow-lg">
      <Ionicons size={28} name="play" color={colors.neutral.white} />
    </View>
  );
}

// Custom tab button that shows toast when workout is in progress
function DisabledTabButton({
  children,
  onPress,
  disabled,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled: boolean;
}) {
  const handlePress = () => {
    console.log("🖱️ Tab button pressed, disabled:", disabled);
    if (disabled) {
      Alert.alert(
        "Workout In Progress",
        "Please finish your current workout to continue using the app as usual.",
        [{ text: "OK" }]
      );
    } else {
      onPress?.();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 8,
      }}
    >
      {children}
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const statusBarHeight =
    Platform.OS === "ios" ? 44 : StatusBar.currentHeight || 24;

  const { isWorkoutInProgress } = useWorkout();

  console.log("📱 TabLayout: isWorkoutInProgress =", isWorkoutInProgress);

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
              <TabBarIcon
                name="bar-chart"
                color={color}
                disabled={isWorkoutInProgress}
              />
            ),
            tabBarButton: (props: any) => (
              <DisabledTabButton
                onPress={props.onPress}
                disabled={isWorkoutInProgress}
              >
                {props.children}
              </DisabledTabButton>
            ),
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            tabBarIcon: ({ color }: { color: string }) => (
              <TabBarIcon
                name="calendar"
                color={color}
                disabled={isWorkoutInProgress}
              />
            ),
            tabBarButton: (props: any) => (
              <DisabledTabButton
                onPress={props.onPress}
                disabled={isWorkoutInProgress}
              >
                {props.children}
              </DisabledTabButton>
            ),
          }}
        />
        <Tabs.Screen
          name="workout"
          options={{
            tabBarIcon: () => <WorkoutTabIcon />,
            // Workout tab should always be accessible - no custom button needed
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            tabBarIcon: ({ color }: { color: string }) => (
              <TabBarIcon
                name="search"
                color={color}
                disabled={isWorkoutInProgress}
              />
            ),
            tabBarButton: (props: any) => (
              <DisabledTabButton
                onPress={props.onPress}
                disabled={isWorkoutInProgress}
              >
                {props.children}
              </DisabledTabButton>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            tabBarIcon: ({ color }: { color: string }) => (
              <TabBarIcon
                name="person"
                color={color}
                disabled={isWorkoutInProgress}
              />
            ),
            tabBarButton: (props: any) => (
              <DisabledTabButton
                onPress={props.onPress}
                disabled={isWorkoutInProgress}
              >
                {props.children}
              </DisabledTabButton>
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
