import { registerRootComponent } from "expo";
import { ExpoRoot } from "expo-router";
import { startNetworkLogging } from "react-native-network-logger";

// Initialize network logging in development mode
if (__DEV__) {
  startNetworkLogging({
    maxRequests: 500,
  });
}

// Must be exported or Fast Refresh won't update the context
export function App() {
  return <ExpoRoot context={require.context("./app")} />;
}

registerRootComponent(App);
