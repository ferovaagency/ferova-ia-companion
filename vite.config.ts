// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { createHash } from "node:crypto";
import { relative } from "node:path";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// KOA_MOBILE=1 (npm run mobile:build) genera además la interfaz como app de una sola
// página (_shell.html) para empaquetarla dentro de la app de tienda. La web publicada
// en Lovable no define esta variable y sigue igual (SSR).
const mobile = process.env.KOA_MOBILE === "1";

// Identificador estable de cada función de servidor: ruta relativa + nombre. Por defecto
// TanStack usa la ruta absoluta del archivo, distinta en cada máquina; entonces la app
// compilada aquí no encontraría las funciones del servidor que compila Lovable.
function stableServerFnId({ filename, functionName }: { filename: string; functionName: string }) {
  const rel = relative(process.cwd(), filename.split("?")[0]).split("\\").join("/");
  const id = createHash("sha256").update(`${rel}--${functionName}`).digest("hex");
  if (process.env.KOA_LOG_FN_IDS === "1") console.log(`[serverFn] ${rel}--${functionName} ${id}`);
  return id;
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    serverFns: { generateFunctionId: stableServerFnId },
    ...(mobile ? { spa: { enabled: true } } : {}),
  },
});
