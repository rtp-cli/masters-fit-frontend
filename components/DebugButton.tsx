import { TouchableOpacity, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";

export function DebugButton() {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => router.push("/debug")}
    >
      <Text style={styles.emoji}>🐛</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emoji: {
    fontSize: 24,
  },
});
