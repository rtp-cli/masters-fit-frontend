import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Platform,
  StatusBar,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useNavigation, NavigationState } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Header from "@components/Header";
import FloatingActionButton from "@components/FloatingActionButton";
import { colors } from "../../lib/theme";
import { useWorkout } from "@/contexts/WorkoutContext";
import { tabEvents } from "../../lib/tabEvents";

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

// Custom tab button that shows toast when workout is in progress and handles re-clicks
function DisabledTabButton({
  children,
  onPress,
  disabled,
  routeName,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled: boolean;
  routeName: string;
}) {
  const { abandonWorkout } = useWorkout();
  const navigation = useNavigation();

  const handlePress = () => {
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
              abandonWorkout();
              onPress?.();
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
        onPress?.();
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
        paddingVertical: 8,
      }}
    >
      {children}
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const { isWorkoutInProgress } = useWorkout();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Header />
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
                routeName="dashboard"
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
                routeName="calendar"
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
            tabBarButton: (props: any) => (
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
                routeName="search"
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
                routeName="settings"
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
  </SafeAreaView>
  );
}
