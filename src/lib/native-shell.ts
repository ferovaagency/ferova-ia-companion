import { APP_ORIGIN, isNativeApp, nativePlatform } from "./platform";

let started = false;

/** Abre una URL fuera de la app: navegador del sistema o la app que la maneje (WhatsApp, X…). */
export async function openExternal(url: string) {
  if (!isNativeApp()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }
  const { Browser } = await import("@capacitor/browser");
  await Browser.open({ url });
}

function isExternal(href: string) {
  try {
    const u = new URL(href, window.location.href);
    if (u.origin === window.location.origin) return false;
    return u.protocol === "http:" || u.protocol === "https:" || u.protocol === "mailto:" || u.protocol === "tel:";
  } catch {
    return false;
  }
}

/**
 * Comportamiento de app de tienda. Solo actúa dentro de Capacitor; en la web no hace nada.
 * - Botón «atrás» de Android: retrocede en la app y, en la primera pantalla, la cierra.
 * - Enlaces externos (Amazon, redes, Whop): fuera de la app, nunca dentro del WebView.
 * - Enlaces a la web (https://librero-ia.ferova.com.co/...): se abren dentro de la app.
 */
export function startNativeShell(navigate: (path: string) => void) {
  if (started || typeof window === "undefined" || !isNativeApp()) return;
  started = true;
  document.documentElement.classList.add("koa-native", `koa-${nativePlatform()}`);

  document.addEventListener(
    "click",
    (event) => {
      const a = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || event.defaultPrevented) return;
      const href = a.getAttribute("href") ?? "";
      if (href.startsWith(APP_ORIGIN)) {
        event.preventDefault();
        navigate(href.slice(APP_ORIGIN.length) || "/");
        return;
      }
      if (!isExternal(href)) return;
      event.preventDefault();
      void openExternal(a.href);
    },
    true,
  );

  void import("@capacitor/app").then(({ App }) => {
    void App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else void App.exitApp();
    });
    // Enlaces universales / App Links hacia la web: abren la ruta dentro de la app.
    void App.addListener("appUrlOpen", ({ url }) => {
      if (url.startsWith(APP_ORIGIN)) navigate(url.slice(APP_ORIGIN.length) || "/");
    });
  });
}
