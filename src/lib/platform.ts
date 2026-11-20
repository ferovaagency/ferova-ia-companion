// Dónde corre la app: navegador o app de tienda (Capacitor).
// Las tiendas no permiten vender suscripciones digitales con un pago externo (Whop):
// Apple 3.1.1 y la política de pagos de Google Play. Dentro de la app nativa no se
// muestran botones ni enlaces de compra; quien ya es Pro (por la web) lo sigue siendo.

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
