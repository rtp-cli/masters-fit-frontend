import { View, Text, Image } from "react-native";

export default function Header() {
  return (
    <View className="flex-row items-center justify-center mt-3">
      <Image
        source={require("../assets/logo-dark.png")}
        className="w-10 h-10 mr-2"
      />
      <Text className="text-3xl font-semibold text-text-primary">
        MastersFit
      </Text>
    </View>
  );
}
