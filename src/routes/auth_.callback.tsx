import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cleanAuthUrl, readAuthReturn } from "@/lib/auth-return";

export const Route = createFileRoute("/auth_/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrando… — Lee con Koa" },
      { name: "description", content: "Completando tu acceso a Lee con Koa." },
      { property: "og:title", content: "Acceso — Lee con Koa" },
      { property: "og:description", content: "Retorno seguro a tu espacio lector." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthCallback,
});

// El layout raíz desmonta y vuelve a montar esta página cuando cambia la
// identidad, así que la hidratación se hace una sola vez por carga.
let hydration: Promise<string | null> | undefined;

function hydrate(href: string): Promise<string | null> {
  hydration ??= (async () => {
    const ret = readAuthReturn(href);
    if (ret.error) return `Google o el servicio de acceso respondieron: «${ret.error}».`;
    const current = await supabase.auth.getSession();
    if (current.data.session) return null;
    // supabase-js descarta tokens sin expires_in/token_type: los aplicamos aquí.
    if (ret.accessToken && ret.refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: ret.accessToken,
        refresh_token: ret.refreshToken,
      });
      if (error || !data.session)
        return `Recibimos tus datos de acceso, pero la sesión no se pudo abrir${error ? `: ${error.message}` : ""}.`;
      return null;
    }
    if (ret.code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(ret.code);
      if (error || !data.session)
        return `El código de acceso no se pudo canjear${error ? `: ${error.message}` : ""}.`;
      return null;
    }
    return ret.keys.length
      ? `El retorno no traía datos de sesión (llegó: ${ret.keys.join(", ")}).`
      : "El retorno no traía ningún dato de acceso.";
  })();
  return hydration;
}

function AuthCallback() {
  const navigate = useNavigate();
  const [failure, setFailure] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const href = window.location.href;
    const go = () => {
      if (!active) return;
      active = false;
      window.history.replaceState(window.history.state, "", cleanAuthUrl(href));
      navigate({ to: "/discover", replace: true });
    };
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) go();
    });
    hydrate(href).then(
      async (problem) => {
        if (!active) return;
        if (!problem) return go();
        // Otra pestaña o la detección automática pudieron abrir la sesión mientras tanto.
        const { data: again } = await supabase.auth.getSession();
        if (again.session) return go();
        console.error("[auth/callback]", problem);
        window.history.replaceState(window.history.state, "", cleanAuthUrl(href));
        setFailure(problem);
      },
      (cause) => {
        console.error("[auth/callback]", cause);
        if (active) setFailure("No pudimos completar el inicio de sesión por un error inesperado.");
      },
    );
    const t = setTimeout(() => {
      if (active) setFailure((f) => f ?? "El acceso tardó demasiado en responder.");
    }, 15000);
    return () => {
      active = false;
      data.subscription.unsubscribe();
      clearTimeout(t);
    };
  }, [navigate]);
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-center text-foreground">
      {failure ? (
        <div role="alert" className="max-w-md space-y-3">
          <p>No pudimos completar el inicio de sesión.</p>
          <p className="text-sm text-muted-foreground">{failure}</p>
          <a className="underline" href="/auth">
            Intentar de nuevo
          </a>
        </div>
      ) : (
        <p role="status">Entrando a tu biblioteca…</p>
      )}
    </main>
  );
}
