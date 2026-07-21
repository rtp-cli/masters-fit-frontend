// [T5-8] Route only — the session screen lives in components/workout/ per the
// "app/ is navigation-only" rule. See TRACK5_LOGGING_REDESIGN_SCOPE doc.
import { WorkoutScreen as WorkoutComponent } from "@/components/workout";

export default function Workout() {
  return <WorkoutComponent />;
}
