import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useAuth } from "@hooks/useAuth";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DashboardScreen() {
  // const { user } = useAuth();
  const user = {
    name: "John Doe",
    email: "john.doe@example.com",
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.welcomeText}>
            Welcome, {user?.name || "Fitness Enthusiast"}!
          </Text>
          <Text style={styles.subtitle}>Your fitness journey at a glance</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Workouts this week</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Hours active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>1250</Text>
            <Text style={styles.statLabel}>Calories burned</Text>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Upcoming Workouts</Text>
          <View style={styles.workoutCard}>
            <Text style={styles.workoutName}>Upper Body Strength</Text>
            <Text style={styles.workoutDetails}>
              Tomorrow · 45 min · Medium Intensity
            </Text>
          </View>
          <View style={styles.workoutCard}>
            <Text style={styles.workoutName}>Cardio Blast</Text>
            <Text style={styles.workoutDetails}>
              May 18 · 30 min · High Intensity
            </Text>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Your Progress</Text>
          <View style={styles.progressCard}>
            <Text style={styles.progressTitle}>Weekly Goal Completion</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: "70%" }]} />
            </View>
            <Text style={styles.progressText}>70% Complete (3/5 workouts)</Text>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Recent Achievements</Text>
          <View style={styles.achievementCard}>
            <Text style={styles.achievementTitle}>Consistency Champion</Text>
            <Text style={styles.achievementDesc}>
              Completed 5 workouts in 2 weeks
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollView: {
    flex: 1,
    paddingBottom: 20,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  subtitle: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 15,
    width: "31%",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#4f46e5",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 4,
  },
  sectionContainer: {
    marginTop: 25,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  workoutCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  workoutDetails: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
  progressCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    marginBottom: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4f46e5",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: "#6b7280",
  },
  achievementCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  achievementDesc: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },
});
