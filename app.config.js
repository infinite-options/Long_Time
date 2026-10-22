const path = require("path");

try {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
} catch {
  /* Expo also loads EXPO_PUBLIC_ variables from .env */
}

module.exports = {
  expo: {
    name: "Long Time No See",
    slug: "long-time-no-see",
    scheme: "longtimenosee",
    version: "1.0.0",
    orientation: "default",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    backgroundColor: "#241812",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#241812",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.longtimenosee.app",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: "com.longtimenosee.app",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#241812",
      },
    },
    web: {
      bundler: "metro",
      backgroundColor: "#241812",
      favicon: "./assets/favicon.png",
      name: "Long Time No See",
      shortName: "No See",
      display: "standalone",
      themeColor: "#241812",
    },
  },
};
