import type { CapacitorConfig } from "@capacitor/cli";

// App de tienda (Play Store / App Store).
// La interfaz va dentro del paquete (npm run mobile:build → mobile/www): abre al instante
// y no depende de la web para mostrarse. Los datos y las funciones de servidor (Oráculo,
// planes, Koa) se piden a https://librero-ia.ferova.com.co (src/lib/platform.ts).
// Un cambio de interfaz requiere volver a compilar y subir la app a las tiendas.
const config: CapacitorConfig = {
  appId: "co.com.ferova.leeconkoa",
  appName: "Lee con Koa",
  webDir: "mobile/www",
  backgroundColor: "#14122b",
  server: {
    androidScheme: "https",
    iosScheme: "capacitor",
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: "never",
    backgroundColor: "#14122b",
  },
};

export default config;
