// Empaqueta la interfaz dentro de la app de tienda.
// 1. Compila en modo de una sola página (KOA_MOBILE=1 → _shell.html).
// 2. Copia el resultado a mobile/www, que Capacitor mete en los proyectos android/ e ios/.
// Uso: npm run mobile:build  (luego npm run mobile:android o npm run mobile:ios)
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, renameSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, ".output", "public");
const www = join(root, "mobile", "www");

const build = spawnSync("npx", ["vite", "build"], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, KOA_MOBILE: "1" },
});
if (build.status !== 0) process.exit(build.status ?? 1);
if (!existsSync(join(out, "_shell.html"))) {
  console.error("No se generó _shell.html: revisa la opción spa en vite.config.ts.");
  process.exit(1);
}

rmSync(www, { recursive: true, force: true });
cpSync(out, www, { recursive: true });
renameSync(join(www, "_shell.html"), join(www, "index.html"));
// Archivos solo para el hosting web.
for (const f of ["_headers", "_redirects", "robots.txt", "llms.txt"]) rmSync(join(www, f), { force: true });

if (process.argv.includes("--no-sync")) process.exit(0);
const sync = spawnSync("npx", ["cap", "sync"], { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
process.exit(sync.status ?? 0);
