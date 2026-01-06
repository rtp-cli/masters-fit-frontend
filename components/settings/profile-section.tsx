import { View, Text } from "react-native";
import { User } from "@/lib/types";

interface ProfileSectionProps {
  user: User | null;
}

export default function ProfileSection({ user }: ProfileSectionProps) {
  // Get user initials
  const getUserInitials = () => {
    if (user?.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return "U";
  };

  return (
    <View className="items-center px-6 mb-6">
      <View className="w-20 h-20 rounded-full bg-primary items-center justify-center mb-4">
        <Text className="text-3xl font-bold text-white">
          {getUserInitials()}
        </Text>
      </View>
      <Text className="text-xl font-bold text-text-primary">
        {user?.name || "User"}
      </Text>
      <Text className="text-sm text-text-muted mt-1">
        {user?.email || "No email provided"}
      </Text>
    </View>
  );
}
