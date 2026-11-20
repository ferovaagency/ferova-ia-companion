import type { CapacitorConfig } from "@capacitor/cli";

// App de tienda (Play Store / App Store) que carga Lee con Koa desde producción.
// La app depende de funciones de servidor (Oráculo, planes, Whop), así que no se
// empaqueta como sitio estático: cada publicación en Lovable llega a la app sin
// pasar por revisión. mobile/www solo se muestra si no hay conexión.
const config: CapacitorConfig = {
  appId: "co.com.ferova.leeconkoa",
  appName: "Lee con Koa",
  webDir: "mobile/www",
  server: {
    url: "https://librero-ia.ferova.com.co",
    cleartext: false,
    errorPath: "offline.html",
    allowNavigation: ["librero-ia.ferova.com.co", "*.supabase.co"],
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: "automatic",
    limitsNavigationsToAppBoundDomains: false,
  },
};

export default config;
