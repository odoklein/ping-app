import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ping.crm",
  appName: "Ping CRM",
  webDir: "public",
  server: {
    // Live production URL
    url: process.env.CAPACITOR_SERVER_URL || "https://crm.ping-leadagency.fr",
    cleartext: false,
    allowNavigation: [
      "crm.ping-leadagency.fr",
      "*.ping-leadagency.fr",
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
