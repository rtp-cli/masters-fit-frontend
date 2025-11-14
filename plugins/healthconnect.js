module.exports = function withHealthConnect(config) {
  return {
    ...config,
    android: {
      ...config.android,
      permissions: [
        "android.permission.health.READ_STEPS",
        "android.permission.health.READ_ACTIVE_CALORIES_BURNED",
        "android.permission.health.READ_HEART_RATE"
      ]
    }
  };
};
