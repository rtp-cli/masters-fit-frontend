## Overview
- Add a UI card on `app/(tabs)/dashboard.tsx` that connects to Apple HealthKit (iOS) or Health Connect (Android) and shows today’s step count.
- Automatically fetch today’s steps immediately after a successful connect.

## Prerequisites
- Packages installed: `react-native-health`, `react-native-health-connect`.
- Expo config includes plugins: `./plugins/healthkit`, `./plugins/healthconnect`.
- Use a native build (Dev Client/EAS). Health modules do not work in Expo Go.
- Android device has the Health Connect app installed.

## Implementation Steps
1. Import platform APIs.
2. Add state for steps, readiness, loading, and errors.
3. Implement `connectHealth()` to request permissions and initialize per platform, then auto-call `fetchStepsToday()`.
4. Implement `fetchStepsToday()` to read today’s steps for each platform.
5. Insert a "Steps (Today)" card UI with connect/refresh actions.

## Code Changes (dashboard.tsx)
- Imports:
```ts
import { Platform } from "react-native";
import AppleHealthKit from "react-native-health";
import { initialize, requestPermission, readRecords, StepsRecord } from "react-native-health-connect";
```

- State:
```ts
const [stepsCount, setStepsCount] = useState<number | null>(null);
const [healthReady, setHealthReady] = useState(false);
const [healthLoading, setHealthLoading] = useState(false);
const [healthError, setHealthError] = useState<string | null>(null);
```

- Logic:
```ts
const fetchStepsToday = async () => {
  setHealthError(null);
  setHealthLoading(true);
  try {
    if (Platform.OS === "ios") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const options = { startDate: start.toISOString() } as any;
      const results: any = await new Promise((resolve, reject) => {
        AppleHealthKit.getDailyStepCountSamples(options, (error: any, res: any) => {
          if (error) reject(error); else resolve(res);
        });
      });
      const count = Array.isArray(results) && results.length ? (results[0].value ?? 0) : 0;
      setStepsCount(count);
    } else {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      const records = await readRecords(StepsRecord, { timeRangeFilter: { operator: "between", startTime: start, endTime: end } });
      const total = (records || []).reduce((sum: number, r: any) => sum + (r.count ?? 0), 0);
      setStepsCount(total);
    }
  } catch (e: any) {
    setHealthError(e?.message || "Failed to read steps");
  } finally {
    setHealthLoading(false);
  }
};

const connectHealth = async () => {
  setHealthError(null);
  setHealthLoading(true);
  try {
    if (Platform.OS === "ios") {
      const permissions = { permissions: { read: [AppleHealthKit.Constants.Permissions.StepCount] } } as any;
      await new Promise<void>((resolve, reject) => {
        AppleHealthKit.initHealthKit(permissions, (err: any) => {
          if (err) reject(err); else resolve();
        });
      });
    } else {
      await initialize();
      await requestPermission([{ recordType: StepsRecord, accessType: "read" }]);
    }
    setHealthReady(true);
    await fetchStepsToday();
  } catch (e: any) {
    setHealthError(e?.message || "Health permissions failed");
    setHealthReady(false);
  } finally {
    setHealthLoading(false);
  }
};
```

- UI Card (insert near other cards):
```tsx
<View className="px-4 mb-6">
  <View className="bg-white rounded-2xl p-5 shadow-rn-sm">
    <View className="flex-row items-center justify-between mb-4">
      <Text className="text-base font-semibold text-text-primary">Steps (Today)</Text>
      {healthLoading && (<ActivityIndicator size="small" color={colors.brand.primary} />)}
    </View>
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center">
        <Ionicons name="walk-outline" size={24} color={colors.brand.primary} />
        <Text className="text-lg font-bold text-text-primary ml-3">{stepsCount ?? "—"}</Text>
      </View>
      {!healthReady ? (
        <TouchableOpacity className="bg-secondary rounded-xl px-4 py-2" onPress={connectHealth}>
          <Text className="text-white font-semibold text-sm">Connect Health</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity className="bg-primary rounded-xl px-4 py-2" onPress={fetchStepsToday}>
          <Text className="text-text-primary font-semibold text-sm">Refresh</Text>
        </TouchableOpacity>
      )}
    </View>
    {healthError && (
      <Text className="text-xs text-accent mt-3">{healthError}</Text>
    )}
  </View>
</View>
```

## Behavior
- Tap "Connect Health"; once permissions are granted, the card auto-fetches and displays today’s steps.
- Tap "Refresh" to re-read the count.

## Validation
- iOS: Run on device, allow permissions, verify count.
- Android: Ensure Health Connect installed, allow permissions, verify count.

## Future
- Move logic to a shared health utility and extend with heart rate/calories.