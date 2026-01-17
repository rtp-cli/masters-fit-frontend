import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useRef, useContext } from "react";
import { View, TouchableOpacity, GestureResponderEvent } from "react-native";
import { NavigationContainerRefContext } from "@react-navigation/native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import FloatingActionButton from "@/components/floating-action-button";
import { useThemeColors } from "@/lib/theme";
import { useWorkout } from "@/contexts/workout-context";
import { tabEvents } from "@/lib/tab-events";
import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { CustomDialog } from "@/components/ui";

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
  // Use NavigationContainerRefContext directly - it never throws, just returns undefined
  // when navigation context isn't available (e.g., during dark mode initialization)
  const navigationRef = useContext(NavigationContainerRefContext);
  const currentRoute = navigationRef?.getCurrentRoute()?.name;
  const [dialogVisible, setDialogVisible] = useState(false);
  const pendingEventRef = useRef<GestureResponderEvent | null>(null);

  const handlePress = (e: GestureResponderEvent) => {
    if (disabled) {
      pendingEventRef.current = e;
      setDialogVisible(true);
    } else if (currentRoute === routeName) {
      // Already on this tab - emit scroll-to-top event
      tabEvents.emit(`scrollToTop:${routeName}`);
    } else {
      // Navigate to the tab normally
      onPress?.(e);
    }
  };

  return (
    <>
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

      <CustomDialog
        visible={dialogVisible}
        onClose={() => {
          setDialogVisible(false);
          pendingEventRef.current = null;
        }}
        title="Workout In Progress"
        description="You have a workout in progress. Leaving will require you to start the workout over again."
        secondaryButton={{
          text: "Cancel",
          onPress: () => {
            setDialogVisible(false);
            pendingEventRef.current = null;
          },
        }}
        primaryButton={{
          text: "Leave Anyway",
          onPress: () => {
            setDialogVisible(false);
            abandonWorkout("navigation");
            const event = pendingEventRef.current;
            pendingEventRef.current = null;
            if (event && onPress) {
              onPress(event);
            }
          },
        }}
        icon="warning"
      />
    </>
  );
}

export default function TabLayout() {
  const colors = useThemeColors();
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
              backgroundColor: colors.background,
              borderTopWidth: 1,
              borderTopColor: colors.neutral.medium[1],
              height: 60,
              paddingTop: 8,
              paddingBottom: 8,
            },
          }}
        >
          <Tabs.Screen
            name="dashboard"
            options={{
              tabBarIcon: ({ color }: { color: string }) => (
                <TabBarIcon
                  name="stats-chart-outline"
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
                  name="barbell-outline"
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
                  name="calendar-outline"
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
    </SafeAreaView>
  );
}
