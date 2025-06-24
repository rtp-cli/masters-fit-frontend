const { getDefaultConfig } = require("@expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Add path alias support
config.resolver.alias = {
  "@": path.resolve(__dirname, "./"),
  "@components": path.resolve(__dirname, "./components"),
  "@contexts": path.resolve(__dirname, "./contexts"),
  "@hooks": path.resolve(__dirname, "./hooks"),
  "@lib": path.resolve(__dirname, "./lib"),
  "@utils": path.resolve(__dirname, "./utils"),
  "@assets": path.resolve(__dirname, "./assets"),
  "@types": path.resolve(__dirname, "./types"),
};

module.exports = withNativeWind(config, { input: "./global.css" });
