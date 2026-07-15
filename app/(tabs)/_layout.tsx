import { Ionicons } from "@expo/vector-icons";
import { type BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { Tabs, usePathname } from "expo-router";
import React, { useRef,useState } from "react";
import { type GestureResponderEvent,TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import GenerationDockChip from "@/components/generation-dock-chip";
import { CustomDialog } from "@/components/ui";
import WorkoutGenerationModal from "@/components/workout-generation-modal";
import { useWorkout } from "@/contexts/workout-context";
import { tabEvents } from "@/lib/tab-events";
import { useThemeColors } from "@/lib/theme";

function TabBarIcon({
  name,
  color,
  focused = false,
  disabled = false,
}: {
  /** Filled glyph base, e.g. "stats-chart"; the "-outline" variant is used when inactive. */
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused?: boolean;
  disabled?: boolean;
}) {
  // Solid icon when active, outline when inactive — a non-color selected cue (MF-005/MF-011)
  // so the active tab reads even where the tint step is hard to discriminate.
  const iconName = (
    focused ? name : `${name}-outline`
  ) as keyof typeof Ionicons.glyphMap;
  return (
    <View style={{ opacity: disabled ? 0.4 : 1 }}>
      <Ionicons size={26} name={iconName} color={color} />
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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1">
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: colors.brand.primary,
            // [MF-010] neutral.medium[3] is the same value MF-007 already
            // flagged as a WCAG contrast failure (~3.7:1 on dark
            // backgrounds) and fixed for text.muted -- same fix applies
            // here, since it was never carried over to the tab bar.
            tabBarInactiveTintColor: colors.text.muted,
            tabBarShowLabel: true,
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: "600",
              marginTop: 2,
            },
            tabBarStyle: {
              backgroundColor: colors.background,
              borderTopWidth: 1,
              borderTopColor: colors.neutral.medium[1],
              height: 68,
              paddingTop: 6,
              paddingBottom: 8,
            },
          }}
        >
          <Tabs.Screen
            name="dashboard"
            options={{
              tabBarLabel: "Dashboard",
              tabBarIcon: ({
                color,
                focused,
              }: {
                color: string;
                focused: boolean;
              }) => (
                <TabBarIcon
                  name="stats-chart"
                  color={color}
                  focused={focused}
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
              tabBarLabel: "Workout",
              tabBarIcon: ({
                color,
                focused,
              }: {
                color: string;
                focused: boolean;
              }) => (
                <TabBarIcon
                  name="barbell"
                  color={color}
                  focused={focused}
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
              tabBarLabel: "Calendar",
              tabBarIcon: ({
                color,
                focused,
              }: {
                color: string;
                focused: boolean;
              }) => (
                <TabBarIcon
                  name="calendar"
                  color={color}
                  focused={focused}
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

        {/* In-progress generation dock chip — docked above the tab bar */}
        <GenerationDockChip />

        {/* Workout generation progress modal */}
        <WorkoutGenerationModal />
      </View>
    </SafeAreaView>
  );
}
