import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BookOpen, Mail, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Librero IA" },
      { name: "description", content: "Inicia sesión o crea tu cuenta en Librero IA para acceder a tu estantería personal con IA." },
      { property: "og:title", content: "Entrar a Librero IA" },
      { property: "og:description", content: "Accede a tu santuario lector: organiza tu TBR y consulta al Oráculo." },
      { property: "og:url", content: "https://ferova-ia-companion.lovable.app/auth" },
    ],
    links: [
      { rel: "canonical", href: "https://ferova-ia-companion.lovable.app/auth" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/library" });
    });
  }, [navigate]);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const fn = mode === "signin" ? supabase.auth.signInWithPassword : supabase.auth.signUp;
      const { error } = await fn.call(supabase.auth, {
        email,
        password,
        options: { emailRedirectTo: window.location.origin + "/library" },
      } as any);
      if (error) throw error;
      navigate({ to: "/library" });
    } catch (err: any) {
      setError(err?.message || "Algo salió mal");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/library" });
    if (result.error) {
      setError(result.error.message);
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/library" });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <BookOpen className="w-5 h-5 text-accent" />
          <span className="font-serif font-black tracking-tight">Librero IA</span>
        </Link>

        <div className="bg-card border border-border rounded-sm p-8 shadow-sm">
          <h1 className="font-serif text-2xl font-black tracking-tight mb-1">
            {mode === "signin" ? "Bienvenido de vuelta" : "Crea tu estantería"}
          </h1>
          <p className="text-sm text-muted-foreground font-serif italic mb-6">
            {mode === "signin" ? "Continúa con tu lectura." : "Tu santuario personal te espera."}
          </p>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-foreground text-background py-3 font-mono-label rounded-sm hover:opacity-90 transition-all mb-4 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
            Continuar con Google
          </button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center"><span className="bg-card px-3 font-mono-label">o</span></div>
          </div>

          <form onSubmit={handleEmail} className="space-y-3">
            <div>
              <label className="font-mono-label block mb-1">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-background border border-border px-3 py-2 rounded-sm focus:outline-none focus:border-foreground text-sm" />
            </div>
            <div>
              <label className="font-mono-label block mb-1">Contraseña</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-background border border-border px-3 py-2 rounded-sm focus:outline-none focus:border-foreground text-sm" />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 border border-foreground text-foreground py-3 font-mono-label rounded-sm hover:bg-foreground hover:text-background transition-all disabled:opacity-60">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {mode === "signin" ? "Entrar" : "Crear cuenta"}
            </button>
          </form>

          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-5 text-xs text-muted-foreground hover:text-foreground transition-colors block mx-auto">
            {mode === "signin" ? "¿No tienes cuenta? Crear una" : "¿Ya tienes cuenta? Iniciar sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.65 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95S8.78 6.5 12 6.5c1.83 0 3.06.78 3.76 1.45l2.57-2.47C16.72 3.97 14.55 3 12 3 6.98 3 2.95 7.03 2.95 12s4.03 9 9.05 9c5.22 0 8.68-3.67 8.68-8.84 0-.6-.07-1.05-.16-1.46z"/></svg>
  );
}