import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, Sparkles, Library, Wind, ArrowRight, Loader2, Wand2 } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { recommendBook } from "@/lib/books.functions";
import type { RecommendationResult } from "@/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Librero IA — Tu estantería inteligente con IA" },
      { name: "description", content: "Organiza tus libros pendientes, sigue tu velocidad de lectura y recibe recomendaciones personalizadas según tu estado de ánimo, respetando el orden de tus sagas." },
      { property: "og:title", content: "Librero IA — Tu estantería inteligente" },
      { property: "og:description", content: "TBR, progreso, sagas y recomendaciones con IA en un único santuario lector." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-accent" />
          <span className="font-serif font-black tracking-tight text-lg">Librero IA</span>
        </div>
        <Link to="/auth" className="font-mono-label hover:text-accent transition-colors">
          Iniciar sesión
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-16 pb-24">
        <span className="font-mono-label">Santuario lector · IA editorial</span>
        <h1 className="mt-4 font-serif text-5xl sm:text-7xl font-black tracking-tight leading-[1.05]">
          Tu estantería personal,<br />curada por una IA con <em className="text-accent not-italic">intuición literaria</em>.
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl font-serif leading-relaxed">
          Organiza tu TBR con portadas reales, mide tu velocidad de lectura, respeta el orden lógico de tus sagas y recibe recomendaciones según tu estado de ánimo. Sin algoritmos opacos, sin ruido.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 font-mono-label rounded-sm hover:opacity-90 transition-all"
          >
            Entrar a mi biblioteca <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <section className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Library, title: "Catálogo enriquecido", body: "Escribe un título y Lumina añade género, páginas, sinopsis y portada automáticamente." },
            { icon: Sparkles, title: "Recomendaciones por humor", body: "Describe tu estado anímico y recibe el libro perfecto de tu lista o una sugerencia externa." },
            { icon: Wind, title: "Sagas respetadas", body: "Nunca te recomendará el libro 3 si no has leído el 2. Lógica narrativa primero." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="border-t border-border pt-6">
              <Icon className="w-5 h-5 text-accent mb-3" />
              <h3 className="font-serif font-bold text-lg">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </section>
      </main>

      <DemoOracle />

      <footer className="border-t border-border py-6 text-center font-mono-label">
        Librero IA · {new Date().getFullYear()}
      </footer>
    </div>
  );
}

function DemoOracle() {
  const recommend = useServerFn(recommendBook);
  const [vibe, setVibe] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const examples = [
    "Necesito algo corto y luminoso, vengo de un bloqueo lector",
    "Quiero fantasía oscura con prosa cuidada",
    "Una novela negra escandinava, atmosférica",
  ];

  const ask = async (q?: string) => {
    const userRequest = (q ?? vibe).trim();
    if (!userRequest) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await recommend({ data: { userRequest, books: [] } });
      setResult(r);
    } catch (e: any) {
      setError(e?.message || "El oráculo no respondió");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="border-t border-border bg-card/40">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <span className="font-mono-label">Demo · sin registro</span>
        <h2 className="mt-3 font-serif text-3xl sm:text-5xl font-black tracking-tight">
          Pregúntale a <em className="text-accent not-italic">Lumina</em>
        </h2>
        <p className="mt-3 text-muted-foreground font-serif max-w-xl">
          Describe tu vibe lector ahora mismo y el oráculo te sugerirá un libro. Sin login, sin registro.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <textarea
            value={vibe}
            onChange={(e) => setVibe(e.target.value)}
            placeholder="Hoy quiero algo melancólico pero esperanzador, breve, sin violencia gratuita…"
            rows={3}
            className="w-full bg-background border border-border px-4 py-3 rounded-sm font-serif text-base focus:outline-none focus:border-foreground resize-none"
          />
          <div className="flex flex-wrap gap-2">
            {examples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => { setVibe(ex); ask(ex); }}
                className="text-xs px-3 py-1.5 border border-border rounded-full hover:border-foreground transition-colors font-mono-label"
              >
                {ex}
              </button>
            ))}
          </div>
          <button
            onClick={() => ask()}
            disabled={loading || !vibe.trim()}
            className="self-start inline-flex items-center gap-2 bg-foreground text-background px-6 py-3 font-mono-label rounded-sm hover:opacity-90 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            Consultar a Lumina
          </button>
        </div>

        {error && <p className="mt-6 text-sm text-destructive">{error}</p>}

        {result && (
          <div className="mt-8 border border-border bg-background p-6 rounded-sm">
            {result.external ? (
              <div className="flex gap-5">
                {result.external.cover_url && (
                  <img src={result.external.cover_url} alt={result.external.title} className="w-24 h-auto shadow-md" />
                )}
                <div>
                  <span className="font-mono-label text-accent">Sugerencia externa</span>
                  <h3 className="mt-1 font-serif text-2xl font-black">{result.external.title}</h3>
                  <p className="text-sm text-muted-foreground">{result.external.author}</p>
                  {result.external.genre && (
                    <p className="mt-1 text-xs font-mono-label">{result.external.genre}</p>
                  )}
                  <p className="mt-3 font-serif italic text-foreground/90 leading-relaxed">"{result.reasoning}"</p>
                  {result.external.description && (
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{result.external.description}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="font-serif italic text-foreground/90 leading-relaxed">"{result.reasoning}"</p>
            )}
            <div className="mt-5 pt-5 border-t border-border flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">¿Quieres que Lumina recuerde tu estantería y respete tus sagas?</p>
              <Link to="/auth" className="text-xs font-mono-label hover:text-accent transition-colors flex items-center gap-1">
                Crear cuenta gratis <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
