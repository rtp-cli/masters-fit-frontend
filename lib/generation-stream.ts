// Streaming status messages shown on the generation ("timeline") screen while
// a workout plan builds. Turning wait time into visible proof of
// personalization. See design_handoff §3 for copy + rationale.

// Credible backbone — always present, loosely tracks real phases
// (profile → goals/equipment → programming → safety → finalize).
export const CREDIBLE_LINES: string[] = [
  "Analyzing your fitness profile…",
  "Reviewing your goals, equipment, and schedule…",
  "Factoring in recovery, mobility, and joint health…",
  "Checking the plan against your experience level…",
  "Calibrating intensity for maximum progress…",
  "Fine-tuning sets, reps, and recovery intervals…",
  "Running final quality checks…",
  "Considering your available equipment…",
  "Balancing strength, cardio, and recovery…",
  "Optimizing your weekly training schedule…",
  "Adapting for your physical limitations…",
  "Selecting exercises for your experience level…",
  "Matching workouts to your available time…",
  "Planning progressive overload…",
  "Building balanced movement patterns…",
  "Reviewing your recent workout history…",
  "Adjusting training intensity…",
  "Prioritizing recovery between sessions…",
  "Finding the right exercise variations…",
  "Balancing pushing and pulling movements…",
  "Building your warm-up sequence…",
  "Designing your cooldown recommendations…",
  "Reducing unnecessary joint stress…",
  "Planning appropriate rest intervals…",
  "Optimizing exercise order…",
  "Matching volume to your recovery capacity…",
  "Checking for muscle group balance…",
  "Creating sustainable long-term progress…",
  "Personalizing your training split…",
  "Fine-tuning your weekly workload…",
  "Choosing effective exercise substitutions…",
  "Preventing overtraining…",
  "Building a plan that fits your lifestyle…",
  "Reviewing exercise variety and balance…",
  "Validating progression across the week…",
  "Putting the finishing touches on your program…",
];

// Playful — age-aware, never juvenile (audience is masters athletes, 40+).
// Woven in ~1 per 2 credible, only when "Playful messages" is on.
export const PLAYFUL_LINES: string[] = [
  "Rejecting 3,482 terrible workout ideas…",
  "Removing anything that requires the knees of a 22-year-old.",
  "Negotiating with the burpees…",
  "Eliminating exercises that belong on social media instead of in workouts.",
  "Consulting the MastersFit Exercise Brain™…",
  "Making sure it's challenging, not punishing.",
  "Politely declining leg day every day…",
  "Making your muscles file a formal complaint…",
  "Negotiating with gravity…",
  "Looking for excuses to skip cardio… none found.",
  "Removing 'lift the couch' from today's workout…",
  "Stopping AI from scheduling 500 push-ups…",
  "Making sure leg day isn't tomorrow… probably.",
  "Asking your future self if this is a good idea…",
  "Checking if your dumbbells are feeling cooperative…",
  "Trying not to anger your quads…",
  "Teaching the algorithm what 'fun' means…",
  "Hiding the treadmill until it's needed…",
  "Making your future self proud…",
  "Translating fitness science into human…",
  "Making sure every exercise has a point…",
  "Preventing the robot uprising… after this workout.",
  "Searching for gains…",
  "Making sweat statistically likely…",
  "Giving your excuses a timeout…",
  "Calibrating the motivation engine…",
  "Ensuring soreness stays within acceptable limits…",
  "Removing exercises invented by sadists…",
  "Trying to keep Monday from becoming International Chest Day…",
  "Checking whether today is secretly Friday…",
  "Dusting off your personal bests…",
  "Loading extra determination…",
  "Warning your couch you'll be back later…",
  "Making sure the workout hurts your muscles, not your feelings…",
  "Convincing your future self to thank you later…",
  "Counting reps so you don't have to…",
];

export const COACH_LINES: string[] = [
  "Building something you'll actually enjoy…",
  "Creating a workout worth showing up for…",
  "Helping your future self get stronger…",
  "Designing a plan that respects your body…",
  "Finding the right challenge for today…",
  "Keeping consistency ahead of perfection…",
  "Making every rep count…",
  "Turning goals into a plan…",
  "Building strength one workout at a time…",
  "Small improvements. Big results.",
  "Progress beats perfection.",
  "Strong today. Stronger tomorrow.",
  "Training smarter, not just harder…",
  "Every workout has a purpose…",
  "Good things take consistency…",
  "Making fitness fit your life…",
  "Helping you stay in the game…",
  "Building confidence one session at a time…",
  "Longevity starts here…",
  "Keeping you moving forward…",
  "Preparing today's challenge…",
  "Your next workout is almost ready…",
  "A little patience. It'll be worth it.",
  "Making this week's plan uniquely yours…",
  "Customizing every detail…",
  "Finding your sweet spot…",
  "Strength is built one rep at a time…",
  "Designed specifically for you…",
  "Almost there…",
  "Ready to train.",
  "Your best workouts are still ahead…",
  "Building a stronger tomorrow…",
  "Progress is being personalized…",
  "One plan. Built just for you…",
  "Smart training starts with a smart plan…",
  "Your next milestone starts here…",
];

// Shown at 100%, replaces the stream.
export const COMPLETION_LINE =
  "Workout plan locked and loaded. Let's get after it.";

// Fixed bookends: the stream always opens and closes on these credible lines so
// an early-bailing user sees a confident start, and a slow run ends on a
// finishing note. Everything between them is randomized. These are excluded
// from the shuffled credible pool so they can't also appear mid-stream.
export const FIRST_LINE = "Analyzing your fitness profile…";
export const LAST_LINE = "Putting the finishing touches on your program…";

// Fisher–Yates. Uses Math.random — fine on-device; buildStream is memoized per
// generation (by job id) at the call site so the order is stable within a run.
function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Build one generation's status stream:
 *   - always open on FIRST_LINE and close on LAST_LINE;
 *   - between them, randomize each category and interleave one credible, one
 *     playful, one coach per cycle, repeating until the pools are exhausted;
 *   - no line repeats until its category's pool empties; an exhausted category
 *     is simply skipped so the others keep cycling.
 * The FIRST_LINE (a credible line) counts as the first cycle's credible slot,
 * so the interleave starts at playful → coach to avoid two credible lines
 * back-to-back. Generation finishes long before this pool is exhausted, so in
 * practice this drives variety across the first ~15 lines each run.
 */
export function buildStream(): string[] {
  const credible = shuffle(
    CREDIBLE_LINES.filter((l) => l !== FIRST_LINE && l !== LAST_LINE)
  );
  const playful = shuffle(PLAYFUL_LINES);
  const coach = shuffle(COACH_LINES);

  const out: string[] = [FIRST_LINE];

  // Cycle order: playful → coach → credible (the FIRST_LINE already covered
  // this cycle's credible slot).
  const order = [playful, coach, credible];
  while (playful.length || coach.length || credible.length) {
    for (const queue of order) {
      if (queue.length) out.push(queue.shift()!);
    }
  }

  out.push(LAST_LINE);
  return out;
}
