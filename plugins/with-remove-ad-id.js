const { withAndroidManifest } = require("@expo/config-plugins");

const AD_ID = "com.google.android.gms.permission.AD_ID";

// A transitive Google Play-services / analytics dependency injects the
// com.google.android.gms.permission.AD_ID permission at manifest-merge time.
// MastersFit does NOT use the advertising ID (no ad SDKs; iOS ATT was removed
// for the same no-tracking reason), and our Play "Advertising ID" declaration
// says "No" — which Play rejects a submission against when the permission is
// present. android.blockedPermissions does not reliably strip this specific
// permission, so we add an explicit tools:node="remove" marker to the app
// manifest, which the Android manifest merger honors regardless of the
// dependency that added it.
module.exports = function withRemoveAdIdPermission(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // Ensure the `tools` namespace is declared on <manifest>.
    manifest.$ = manifest.$ || {};
    if (!manifest.$["xmlns:tools"]) {
      manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    }

    manifest["uses-permission"] = manifest["uses-permission"] || [];
    // Drop any plain add of AD_ID, then add a single remove marker.
    manifest["uses-permission"] = manifest["uses-permission"].filter(
      (p) => p && p.$ && p.$["android:name"] !== AD_ID
    );
    manifest["uses-permission"].push({
      $: { "android:name": AD_ID, "tools:node": "remove" },
    });

    return cfg;
  });
};
