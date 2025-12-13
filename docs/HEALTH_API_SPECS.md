# Health API Specs

## Context

- I want to track user heart rate, step count and other health metrics
- for now we will cater just heart rate and step count
- I want to be able to rack the data from both android and ios

## Specs

- Create a POC on dashboard.tsx that will show me data
- i want you to setup the code and structure to require and to read the metrics using react native
- suggest what is required to achieve this, is it better to develop natively this feature but with expo we usually dont maintin android and ios apps
- find out some react native libraries as well

# Add Code below to get number of steps

`
iOS — Apple HealthKit
import AppleHealthKit from 'react-native-health';

const permissions = {
permissions: {
read: [
AppleHealthKit.Constants.Permissions.StepCount,
AppleHealthKit.Constants.Permissions.HeartRate,
],
},
};

AppleHealthKit.initHealthKit(permissions, (err) => {
if (err) {
console.log("HealthKit not available: ", err);
return;
}

// Read steps
const options = { startDate: new Date(2024, 0, 1).toISOString() };

AppleHealthKit.getDailyStepCountSamples(options, (error, results) => {
if (!error) {
console.log("Steps:", results);
}
});
});

Android — Health Connect
import {
initialize,
requestPermission,
readRecords,
StepsRecord,
} from "react-native-health-connect";

export async function initHealthConnect() {
await initialize();

await requestPermission([
{
recordType: StepsRecord,
accessType: "read"
}
]);

const steps = await readRecords(StepsRecord, {
timeRangeFilter: {
operator: "between",
startTime: new Date("2024-01-01"),
endTime: new Date(),
}
});

console.log("Steps:", steps);
}

🧩 4. UNIFY LOGIC WITH A SINGLE ABSTRACTION

Create a reusable API:

import { Platform } from "react-native";
import _ as AppleHealth from "./appleHealth";
import _ as AndroidHealth from "./androidHealth";

export function getSteps(startDate) {
if (Platform.OS === "ios") return AppleHealth.getSteps(startDate);
return AndroidHealth.getSteps(startDate);
}

`

- REQUIREMENTS UPDATE
- now i want to track the following values
  - max heart rate (read)
  - avg heart rate (read)
  - calories tracking (read)
  - workout duration from our current workouts (read and write)
  - step count (read)

# Requirements Changes

- I think we should integrate the device Health Connect interaction into onboarding, add it to the Profile page (not required, but optional), but not make it a showcase feature on the main app dashboard. If a user connects their watch or fitness tracker, we can display some metrics on the main dashboard.

1.  the health connect button should be 2nd last step in onboarding, we should not remove generate weekly plan button
2.  the health connect button connection should be persisted over all, if user once connected then we should not show prompt again cta anywhere in app
3.  in edit profile the connect health button should be shown
4.  in dashboard screen if user has not connected health hide the health carousel else show it
5.  make sure ui is clean and are consistent
    donot over complicate the flow

keep health connection in local storage
