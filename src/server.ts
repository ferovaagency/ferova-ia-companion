import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { nativeCors, withCors } from "./lib/native-cors";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

// Cabeceras de seguridad en todas las respuestas. frame-ancestors deja que solo
// el editor de Lovable incruste la app (vista previa); ningún otro sitio puede
// meterla en un iframe para engañar clics. La cámara se permite al propio sitio
// (escáner de ISBN); micrófono y ubicación no se usan.
const SECURITY_HEADERS: Record<string, string> = {
  "content-security-policy": "frame-ancestors 'self' https://lovable.dev https://*.lovable.dev https://*.lovable.app; base-uri 'self'; object-src 'none'",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(self), microphone=(), geolocation=(), payment=(), usb=()",
  "strict-transport-security": "max-age=31536000; includeSubDomains",
};

function withSecurityHeaders(response: Response): Response {
  const apply = (r: Response) => {
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      if (!r.headers.has(name)) r.headers.set(name, value);
    }
    return r;
  };
  try {
    return apply(response);
  } catch {
    // Cabeceras inmutables (respuestas reenviadas): se copia la respuesta.
    return apply(new Response(response.body, response));
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const cors = nativeCors(request);
    if (cors && request.method === "OPTIONS") return withSecurityHeaders(new Response(null, { status: 204, headers: cors }));
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withCors(withSecurityHeaders(await normalizeCatastrophicSsrResponse(response)), cors);
    } catch (error) {
      console.error(error);
      return withCors(withSecurityHeaders(new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      })), cors);
    }
  },
};
