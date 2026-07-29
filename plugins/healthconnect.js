module.exports = function withHealthConnect(config) {
  return {
    ...config,
    android: {
      ...config.android,
      // Keep in lockstep with app.json android.permissions and the runtime
      // requestPermission list in utils/health.ts — Play review requires a
      // justification for every declared Health Connect permission.
      permissions: [
        "android.permission.health.READ_STEPS",
        "android.permission.health.READ_ACTIVE_CALORIES_BURNED",
        "android.permission.health.READ_TOTAL_CALORIES_BURNED",
        "android.permission.health.READ_HEART_RATE",
        "android.permission.health.READ_EXERCISE_SESSION",
        "android.permission.health.READ_NUTRITION",
        "android.permission.health.WRITE_EXERCISE_SESSION"
      ]
    }
  };
};
