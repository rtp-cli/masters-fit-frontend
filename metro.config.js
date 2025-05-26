const { getDefaultConfig } = require("@expo/metro-config");

const defaultConfig = getDefaultConfig(__dirname);

module.exports = {
  ...defaultConfig,
  watchFolders: [__dirname],
  resolver: {
    ...defaultConfig.resolver,
    sourceExts: ["jsx", "js", "ts", "tsx", "json"],
    dedupedModules: ["react", "react-native"],
  },
  watcher: {
    watchman: {
      crawlSymlinks: false,
    },
  },
};
