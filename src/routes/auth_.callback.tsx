import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth_/callback")({
  ssr: false,
  head: () => ({ meta: [{ title: "Entrando… · Librero IA" }, { name: "robots", content: "noindex" }] }),
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let done = false;
    const go = () => { if (!done) { done = true; navigate({ to: "/discover", replace: true }); } };
    const { data } = supabase.auth.onAuthStateChange((_e, session) => { if (session) go(); });
    supabase.auth.getSession().then(({ data }) => { if (data.session) go(); });
    const t = setTimeout(() => { if (!done) setFailed(true); }, 8000);
    return () => { data.subscription.unsubscribe(); clearTimeout(t); };
  }, [navigate]);
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-center text-foreground">
      {failed ? (
        <p>No pudimos completar el inicio de sesión. <a className="underline" href="/auth">Intenta de nuevo</a>.</p>
      ) : (
        <p>Entrando a tu biblioteca…</p>
      )}
    </main>
  );
}
