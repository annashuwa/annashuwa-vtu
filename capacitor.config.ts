import type { CapacitorConfig } from "@capacitor/cli";

// ANNASHUWA VTU — web app wrapped in native shells (Capacitor).
// The WebView loads the running Next.js app over HTTP (demo mode).
// If your LAN IP changes, update `server.url`, then run: npx cap sync
const config: CapacitorConfig = {
  appId: "com.annashuwa.vtu",
  appName: "ANNASHUWA VTU",
  webDir: "mobile/www",
  server: {
    url: "http://192.168.0.8:3000",
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;