// App de tienda (Capacitor): la interfaz corre en estos orígenes locales y llama a las
// funciones de servidor con su token en Authorization (sin cookies). Solo ellos reciben
// permiso CORS, y solo para funciones de servidor y la API.
export const NATIVE_ORIGINS = new Set(["capacitor://localhost", "https://localhost", "http://localhost"]);
// Solo para pruebas locales del paquete móvil en el navegador: en producción no existe.
const devOrigin = typeof process !== "undefined" ? process.env?.KOA_DEV_NATIVE_ORIGIN : undefined;
if (devOrigin) NATIVE_ORIGINS.add(devOrigin);
const CORS_PATHS = ["/_serverFn", "/api/"];

export function nativeCors(request: Request): Record<string, string> | null {
  const origin = request.headers.get("origin");
  if (!origin || !NATIVE_ORIGINS.has(origin)) return null;
  const path = new URL(request.url).pathname;
  if (!CORS_PATHS.some((p) => path.startsWith(p))) return null;
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": request.headers.get("access-control-request-headers") ?? "authorization, content-type, x-tsr-serverfn, accept",
    "access-control-max-age": "600",
    vary: "Origin",
  };
}

export function withCors(response: Response, cors: Record<string, string> | null): Response {
  if (!cors) return response;
  const apply = (r: Response) => {
    for (const [name, value] of Object.entries(cors)) r.headers.set(name, value);
    return r;
  };
  try {
    return apply(response);
  } catch {
    return apply(new Response(response.body, response));
  }
}
