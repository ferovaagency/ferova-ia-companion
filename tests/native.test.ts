import { afterEach, describe, expect, it, vi } from "vitest";
import { nativeCors, withCors } from "../src/lib/native-cors";
import { APP_ORIGIN, appUrl, canShowPurchase, isNativeApp, nativeAwareFetch } from "../src/lib/platform";

const req = (path: string, origin?: string, extra: Record<string, string> = {}) =>
  new Request(`https://librero-ia.ferova.com.co${path}`, { headers: { ...(origin ? { origin } : {}), ...extra } });

describe("CORS para la app de tienda", () => {
  it("permite los orígenes de Capacitor solo en funciones de servidor y API", () => {
    for (const origin of ["capacitor://localhost", "https://localhost"]) {
      const cors = nativeCors(req("/_serverFn/abc", origin));
      expect(cors?.["access-control-allow-origin"]).toBe(origin);
      expect(cors?.vary).toBe("Origin");
    }
    expect(nativeCors(req("/api/public/oracle-demo", "capacitor://localhost"))).not.toBeNull();
    expect(nativeCors(req("/discover", "capacitor://localhost"))).toBeNull();
  });

  it("rechaza otros sitios y peticiones sin origen", () => {
    expect(nativeCors(req("/_serverFn/abc", "https://evil.example"))).toBeNull();
    expect(nativeCors(req("/_serverFn/abc", "https://localhost.evil.example"))).toBeNull();
    expect(nativeCors(req("/_serverFn/abc"))).toBeNull();
  });

  it("refleja las cabeceras pedidas en el preflight y nunca permite cookies", () => {
    const cors = nativeCors(req("/_serverFn/abc", "https://localhost", { "access-control-request-headers": "authorization, x-tsr-serverfn" }));
    expect(cors?.["access-control-allow-headers"]).toBe("authorization, x-tsr-serverfn");
    expect(cors?.["access-control-allow-credentials"]).toBeUndefined();
    const res = withCors(new Response("ok"), cors);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://localhost");
    expect(withCors(new Response("ok"), null).headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("plataforma", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("en la web compra visible y fetch sin cambios", async () => {
    vi.stubGlobal("window", { location: { origin: "https://librero-ia.ferova.com.co" } });
    expect(isNativeApp()).toBe(false);
    expect(canShowPurchase()).toBe(true);
    const spy = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", spy);
    await nativeAwareFetch("/_serverFn/x");
    expect(spy).toHaveBeenCalledWith("/_serverFn/x", undefined);
  });

  it("en la app nativa oculta la compra y manda las llamadas a producción", async () => {
    vi.stubGlobal("window", { location: { origin: "capacitor://localhost" }, Capacitor: { isNativePlatform: () => true, getPlatform: () => "ios" } });
    expect(isNativeApp()).toBe(true);
    expect(canShowPurchase()).toBe(false);
    expect(appUrl("/auth/callback")).toBe(`${APP_ORIGIN}/auth/callback`);
    const spy = vi.fn(async () => new Response("ok"));
    vi.stubGlobal("fetch", spy);
    await nativeAwareFetch("/_serverFn/x", { method: "POST" });
    expect(spy).toHaveBeenCalledWith(`${APP_ORIGIN}/_serverFn/x`, { method: "POST" });
    await nativeAwareFetch("https://otra.example/y");
    expect(spy).toHaveBeenLastCalledWith("https://otra.example/y", undefined);
  });
});
