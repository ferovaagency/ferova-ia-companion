import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { clearPrivateView, PRIVACY_EVENT } from "@/lib/privacy-cache";

import { supabase } from "@/integrations/supabase/client";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta página no existe o cambió de lugar.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          No se pudo cargar la página
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Puedes volver a intentarlo o regresar al inicio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reintentar
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Lee con Koa — Descubre tu próxima lectura" },
      { name: "description", content: "Estantería digital con IA: organiza tu TBR, sigue tu velocidad de lectura, respeta el orden de tus sagas y recibe recomendaciones según tu estado de ánimo." },
      { name: "author", content: "Lee con Koa" },
      { property: "og:title", content: "Lee con Koa — Descubre tu próxima lectura" },
      { property: "og:description", content: "Estantería digital con IA: organiza tu TBR, sigue tu velocidad de lectura, respeta el orden de tus sagas y recibe recomendaciones según tu estado de ánimo." },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "es_ES" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Lee con Koa — Descubre tu próxima lectura" },
      { name: "twitter:description", content: "Estantería digital con IA: organiza tu TBR, sigue tu velocidad de lectura, respeta el orden de tus sagas y recibe recomendaciones según tu estado de ánimo." },
    ],
    links: [
      {rel:"icon",href:"/koa/favicon.png",type:"image/png"},
      {rel:"stylesheet",href:"https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Literata:ital,wght@0,400;0,500;1,400&display=swap"},
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: (p) => <ErrorComponent error={p.error as Error} reset={p.reset} />,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const [identity, setIdentity] = useState("initial");
  const [switching, setSwitching] = useState(false);
  useEffect(() => {
    let current: string | undefined;
    let revision = 0;
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const next = session?.user.id ?? "anonymous";
      if (next === current && event !== "USER_UPDATED") return;
      current = next;
      const version = ++revision;
      setSwitching(true);
      // Synchronous eviction precedes loading for the new identity, including cross-tab events.
      clearPrivateView(queryClient);
      setIdentity(next);
      void Promise.resolve().then(async () => {
        await router.invalidate();
        if (version === revision) setSwitching(false);
      });
    });
    const storage = (e: StorageEvent) => { if (e.key === "koa-permissions-changed") { clearPrivateView(queryClient); void router.invalidate(); } };
    const privacy = () => { void router.invalidate(); };
    window.addEventListener("storage", storage);
    window.addEventListener(PRIVACY_EVENT, privacy);
    return () => { revision++; data.subscription.unsubscribe(); window.removeEventListener("storage", storage); window.removeEventListener(PRIVACY_EVENT, privacy); };
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      {switching ? <div role="status" className="py-20 text-center">Preparando tu sesión…</div> : <div key={identity}><Outlet /></div>}
    </QueryClientProvider>
  );
}
