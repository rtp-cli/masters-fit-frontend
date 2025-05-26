module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "react-native-reanimated/plugin",
      [
        "module-resolver",
        {
          root: ["."],
          alias: {
            "@": "./app",
            "@components": "./components",
            "@lib": "./lib",
            "@utils": "./utils",
            "@contexts": "./contexts",
            "@hooks": "./hooks",
            "@assets": "./assets",
          },
        },
      ],
    ],
  };
};
