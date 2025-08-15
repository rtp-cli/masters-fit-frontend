import { View, Text, Image } from "react-native";
import { images } from "@/assets";

export default function Header() {
  return (
    <View className="flex-row items-center justify-center mt-3">
      <Image
        key="header-logo"
        source={images.logoDark}
        className="w-7 h-7 mr-2"
      />
      <Text className="text-3xl font-semibold text-text-primary">
        MastersFit
      </Text>
    </View>
  );
}
