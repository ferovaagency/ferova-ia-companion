// Lectura del retorno de OAuth (broker de Lovable o enlaces de Supabase).
// supabase-js solo acepta tokens en la URL cuando llegan access_token,
// refresh_token, expires_in y token_type juntos; si falta alguno descarta el
// retorno sin avisar. Este módulo recoge lo que sí llegó para completarlo.

export type AuthReturn = {
  accessToken?: string;
  refreshToken?: string;
  code?: string;
  error?: string;
  /** Nombres (nunca valores) de los parámetros recibidos, para diagnóstico. */
  keys: string[];
};

const OAUTH_KEYS = [
  "access_token",
  "refresh_token",
  "provider_token",
  "provider_refresh_token",
  "code",
  "expires_in",
  "expires_at",
  "token_type",
  "state",
  "type",
  "error",
  "error_code",
  "error_description",
];

function collect(href: string) {
  const url = new URL(href);
  const params = new URLSearchParams(url.search);
  // Igual que supabase-js: los valores del hash prevalecen sobre la query.
  new URLSearchParams(url.hash.replace(/^#/, "")).forEach((value, key) => params.set(key, value));
  return { url, params };
}

export function readAuthReturn(href: string): AuthReturn {
  const { params } = collect(href);
  const error = params.get("error_description") || params.get("error") || undefined;
  return {
    accessToken: params.get("access_token") || undefined,
    refreshToken: params.get("refresh_token") || undefined,
    code: params.get("code") || undefined,
    error: error?.slice(0, 300),
    keys: [...new Set(params.keys())].sort(),
  };
}

/** Ruta sin tokens ni parámetros de OAuth, para no dejarlos en el historial. */
export function cleanAuthUrl(href: string): string {
  const { url } = collect(href);
  for (const key of OAUTH_KEYS) url.searchParams.delete(key);
  const query = url.searchParams.toString();
  return url.pathname + (query ? `?${query}` : "");
}
