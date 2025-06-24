module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      [
        "module-resolver",
        {
          root: ["."],
          alias: {
            "@": "./",
            "@components": "./components",
            "@lib": "./lib",
            "@utils": "./utils",
            "@contexts": "./contexts",
            "@hooks": "./hooks",
            "@assets": "./assets",
            "@types": "./types",
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
