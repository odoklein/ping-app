import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ping.crm",
  appName: "Ping CRM",
  webDir: "public",
  server: {
    // Live webview URL: points to production or local staging via CAPACITOR_SERVER_URL
    url: process.env.CAPACITOR_SERVER_URL || "https://app.ping-crm.com",
    cleartext: false,
    allowNavigation: [
      "app.ping-crm.com",
      "*.ping-crm.com",
      "accounts.google.com",
      "login.microsoftonline.com",
      "*.sslip.io",
    ],
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0B132B",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      overlaysWebView: true,
    },
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
    scheme: "PingCRM",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
