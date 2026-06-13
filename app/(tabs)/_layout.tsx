import { Tabs, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useState, useRef } from "react";
import { View, TouchableOpacity, GestureResponderEvent } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import WorkoutGenerationModal from "@/components/workout-generation-modal";
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
  const { abandonWorkout, endWorkoutEarly } = useWorkout();
  const pathname = usePathname();
  const [dialogVisible, setDialogVisible] = useState(false);
  const pendingEventRef = useRef<GestureResponderEvent | null>(null);

  const handlePress = (e: GestureResponderEvent) => {
    const isActive = pathname === `/${routeName}`;
    if (disabled) {
      pendingEventRef.current = e;
      setDialogVisible(true);
    } else if (isActive) {
      tabEvents.emit(`scrollToTop:${routeName}`);
    } else {
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
        description="End now to save progress and mark the workout as done. Or leave and pick up where you left off next time."
        primaryButton={{
          text: "Continue Workout",
          onPress: () => {
            setDialogVisible(false);
            pendingEventRef.current = null;
          },
        }}
        tertiaryButton={{
          text: "Finish & Save Progress",
          onPress: async () => {
            setDialogVisible(false);
            await endWorkoutEarly();
            const event = pendingEventRef.current;
            pendingEventRef.current = null;
            if (event && onPress) onPress(event);
          },
        }}
        secondaryButton={{
          text: "Abandon Workout",
          destructive: true,
          onPress: () => {
            setDialogVisible(false);
            abandonWorkout("navigation");
            const event = pendingEventRef.current;
            pendingEventRef.current = null;
            if (event && onPress) onPress(event);
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
            tabBarActiveTintColor: colors.brand.primary,
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

        {/* Workout generation progress modal */}
        <WorkoutGenerationModal />
      </View>
    </SafeAreaView>
  );
}
