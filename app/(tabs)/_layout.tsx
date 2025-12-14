import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  TouchableOpacity,
  Alert,
  GestureResponderEvent,
  Platform,
} from "react-native";
import { useNavigation, NavigationState } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Header from "@/components/header";
import FloatingActionButton from "@/components/floating-action-button";
import { colors } from "@/lib/theme";
import { useWorkout } from "@/contexts/WorkoutContext";
import { tabEvents } from "@/lib/tabEvents";
import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";

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

// Custom tab button that shows toast when workout is in progress and handles re-clicks
function DisabledTabButton({
  children,
  onPress,
  disabled,
  routeName,
}: {
  children: React.ReactNode;
  onPress?: (e: any) => void;
  disabled: boolean;
  routeName: string;
}) {
  const { abandonWorkout } = useWorkout();
  const navigation = useNavigation();

  const handlePress = (e: GestureResponderEvent) => {
    if (disabled) {
      Alert.alert(
        "Workout In Progress",
        "You have a workout in progress. Leaving will require you to start the workout over again.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Leave Anyway",
            style: "destructive",
            onPress: () => {
              abandonWorkout("navigation");
              onPress?.(e);
            },
          },
        ]
      );
    } else {
      // Check if we're already on this tab
      const currentRoute = (navigation.getState() as NavigationState).routes[
        (navigation.getState() as NavigationState).index
      ]?.name;

      if (currentRoute === routeName) {
        // Emit scroll-to-top event for the current tab
        tabEvents.emit(`scrollToTop:${routeName}`);
      } else {
        // Navigate to the tab normally
        onPress?.(e);
      }
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const { isWorkoutInProgress } = useWorkout();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1">
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.text.primary,
            tabBarInactiveTintColor: colors.neutral.medium[3],
            tabBarShowLabel: false,
            tabBarStyle: {
              borderTopWidth: 1,
              borderTopColor: colors.neutral.medium[1],
              height: 70,
              paddingTop: 10,
              paddingBottom: 10,
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
              tabBarButton: (props: BottomTabBarButtonProps) => (
                <DisabledTabButton
                  onPress={props.onPress}
                  disabled={isWorkoutInProgress}
                  routeName="dashboard"
                >
                  {props.children}
                </DisabledTabButton>
              ),
            }}
          />
          <Tabs.Screen
            name="workout"
            options={{
              tabBarIcon: ({ color }: { color: string }) => (
                <TabBarIcon
                  name="play"
                  color={color}
                  disabled={isWorkoutInProgress}
                />
              ),
              tabBarButton: (props: BottomTabBarButtonProps) => (
                <DisabledTabButton
                  onPress={props.onPress}
                  disabled={false} // Workout tab is always accessible
                  routeName="workout"
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
              tabBarButton: (props: BottomTabBarButtonProps) => (
                <DisabledTabButton
                  onPress={props.onPress}
                  disabled={isWorkoutInProgress}
                  routeName="calendar"
                >
                  {props.children}
                </DisabledTabButton>
              ),
            }}
          />
        </Tabs>

        {/* Floating Action Button for background jobs */}
        <FloatingActionButton />
      </View>
      {Platform.OS === "android" && (
        <View
          style={{
            height: insets.bottom ?? 0,
            backgroundColor: colors.background,
          }}
        />
      )}
    </SafeAreaView>
  );
}
