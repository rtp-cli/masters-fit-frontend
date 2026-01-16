/**
 * Expo Config Plugin to fix AndroidX compatibility issues
 * Adds resolution strategy to map old Android Support Library to AndroidX
 */

const { withProjectBuildGradle } = require("expo/config-plugins");

function withAndroidXFix(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      config.modResults.contents = addAndroidXResolutionStrategy(
        config.modResults.contents
      );
    }
    return config;
  });
}

function addAndroidXResolutionStrategy(buildGradle) {
  // Check if the resolution strategy is already added
  if (buildGradle.includes("// AndroidX Fix: Force support library to AndroidX")) {
    return buildGradle;
  }

  const resolutionStrategy = `
    // AndroidX Fix: Force support library to AndroidX
    configurations.all {
        resolutionStrategy {
            eachDependency { details ->
                if (details.requested.group == 'com.android.support') {
                    if (details.requested.name == 'support-compat') {
                        details.useTarget group: 'androidx.core', name: 'core', version: '1.13.0'
                    } else if (details.requested.name == 'support-v4') {
                        details.useTarget group: 'androidx.legacy', name: 'legacy-support-v4', version: '1.0.0'
                    } else if (details.requested.name == 'appcompat-v7') {
                        details.useTarget group: 'androidx.appcompat', name: 'appcompat', version: '1.6.1'
                    } else if (details.requested.name == 'versionedparcelable') {
                        details.useTarget group: 'androidx.versionedparcelable', name: 'versionedparcelable', version: '1.1.1'
                    }
                }
            }
        }
    }`;

  // Find the allprojects block and add the resolution strategy inside it
  const allProjectsRegex = /(allprojects\s*\{[^}]*repositories\s*\{[^}]*\})/;
  
  if (allProjectsRegex.test(buildGradle)) {
    return buildGradle.replace(
      allProjectsRegex,
      `$1\n${resolutionStrategy}`
    );
  }

  return buildGradle;
}

module.exports = withAndroidXFix;

