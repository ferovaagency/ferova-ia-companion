// Dónde corre la app: navegador o app de tienda (Capacitor).
// En la app de tienda la interfaz viaja dentro del paquete (capacitor://localhost en iOS,
// https://localhost en Android) y solo los datos van a internet: las funciones de
// servidor se llaman en APP_ORIGIN.
//
// Las tiendas no permiten vender suscripciones digitales con un pago externo (Whop):
// Apple 3.1.1 y la política de pagos de Google Play. Dentro de la app nativa no se
// muestran botones ni enlaces de compra; quien ya es Pro (por la web) lo sigue siendo.

// VITE_KOA_APP_ORIGIN solo para probar el paquete contra un servidor local.
export const APP_ORIGIN: string = import.meta.env.VITE_KOA_APP_ORIGIN || "https://librero-ia.ferova.com.co";

type Cap = { isNativePlatform?: () => boolean; getPlatform?: () => string };
const cap = (): Cap | undefined =>
  typeof window === "undefined" ? undefined : (window as unknown as { Capacitor?: Cap }).Capacitor;

export function isNativeApp(): boolean {
  return Boolean(cap()?.isNativePlatform?.());
}

export function nativePlatform(): "ios" | "android" | "web" {
  const p = cap()?.getPlatform?.();
  return p === "ios" || p === "android" ? p : "web";
}

/** Botones de "Pasar a Pro", precios y enlaces a Whop: solo en la web. */
export function canShowPurchase(): boolean {
  return !isNativeApp();
}

/** URL pública de una ruta: en la app nativa el origen local no sirve para correos ni enlaces. */
export function appUrl(path: string): string {
  if (typeof window === "undefined" || isNativeApp()) return `${APP_ORIGIN}${path}`;
  return `${window.location.origin}${path}`;
}

/** fetch para las funciones de servidor: en la app nativa las rutas relativas van a producción. */
export const nativeAwareFetch: typeof fetch = (input, init) => {
  if (isNativeApp() && typeof input === "string" && input.startsWith("/")) return fetch(`${APP_ORIGIN}${input}`, init);
  return fetch(input, init);
};
